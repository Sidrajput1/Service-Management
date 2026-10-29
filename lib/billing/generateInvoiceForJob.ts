import { Booking, ServiceOffering } from "@/models";
import Invoice from "@/models/invoice";
import { generateInvoiceNumber } from "./generateInvoiceNumber";
import Job from "@/models/job";
import mongoose from "mongoose";
import { prepareInvoiceFinance } from "@/lib/finance-ledger";

async function attachInvoiceIfMissing(
  jobId: mongoose.Types.ObjectId,
  invoiceId: mongoose.Types.ObjectId,
) {
  await Job.updateOne(
    {
      _id: jobId,
      $or: [{ invoiceId: { $exists: false } }, { invoiceId: null }],
    },
    { $set: { invoiceId } },
  );
}

export function calculateInvoiceTotals(items: any[], taxPercent: number) {
  const subtotal = items.reduce(
    (total, item) => total + Number(item.amount || 0),
    0,
  );

  const taxableAmount = items.reduce(
    (total, item) => total + (item.taxable ? Number(item.amount || 0) : 0),
    0,
  );

  const taxAmount =
    Math.round(((taxableAmount * Number(taxPercent || 0)) / 100) * 100) / 100;

  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    subtotal,
    taxAmount,
    grandTotal,
  };
}

export async function generateInvoiceForJob(jobId: mongoose.Types.ObjectId) {
  /*
   * Idempotency:
   *
   * If invoice already exists, don't generate
   * another one.
   */
  const existing = await Invoice.findOne({
    jobId,
  });

  if (existing) {
    await attachInvoiceIfMissing(jobId, existing._id);
    await prepareInvoiceFinance(existing._id);
    return existing;
  }

  const job = await Job.findById(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "completed") {
    throw new Error("Invoice can only be generated after job completion");
  }

  const booking = await Booking.findById(job.bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  /*
   * Load ServiceOffering only as a fallback
   * for old bookings that don't have taxPercent.
   */
  const offering = booking.serviceOfferingId
    ? await ServiceOffering.findById(booking.serviceOfferingId).lean()
    : null;

  /*
   * Build invoice items
   *
   * 1. Service
   * 2. Parts
   */
  // const items: any[] = [];

  // const serviceAmount =
  //   Number(
  //     booking.pricing
  //       ?.finalPrice ??
  //       booking.estimatedPrice ??
  //       0,
  //   );

  /*
   * SERVICE
   *
   * Very important:
   * use the booking snapshot, NOT the current
   * ServiceOffering price.
   */
  const serviceAmount = Number(
    booking.pricing?.finalPrice ?? booking.estimatedPrice ?? 0,
  );

  if (serviceAmount < 0) {
    throw new Error("Invalid service amount");
  }

  const items: any[] = [];

  // const basePrice =
  //   Number(
  //     booking.pricing
  //       ?.basePrice ||
  //       serviceAmount,
  //   );

  // const discountAmount =
  //   Number(
  //     booking.pricing
  //       ?.discountAmount ||
  //       0,
  //   );

  items.push({
    taxable: true,

    itemType: "service",

    // description:
    //   booking.serviceType ||
    //   "Service",

    description: booking.serviceType || offering?.name || "Service",

    qty:
      booking.pricing?.pricingModel === "per_unit"
        ? Number(booking.pricing.quantity || 1)
        : 1,

    unitPrice:
      booking.pricing?.pricingModel === "per_unit"
        ? serviceAmount / Number(booking.pricing.quantity || 1)
        : serviceAmount,

    amount: serviceAmount,
  });

  /*
   * Add parts used by technician.
   */
  const partsUsed = Array.isArray(job.partsUsed) ? job.partsUsed : [];

  for (const part of partsUsed) {
    const qty = Number(part.qty || 0);

    const unitPrice = Number(part.price || 0);

    const amount = qty * unitPrice;

    if (qty <= 0 || unitPrice < 0) {
      continue;
    }

    items.push({
      taxable: true,

      itemType: "part",

      //description: part.partName,
      description: String(part.partName || "Part"),

      qty,

      unitPrice,

      amount,
      //amount:qty * unitPrice,
    });
  }

  /*
   * TAX
   *
   * First choice:
   * booking snapshot.
   *
   * Fallback:
   * service offering.
   *
   * Final fallback:
   * 18%.
   */
  const taxPercent = Number(
    booking.pricing?.taxPercent ?? offering?.taxPercent ?? 18,
  );

  const totals = calculateInvoiceTotals(items, taxPercent);
  //const taxPercent = Number(booking.pricing?.taxPercent || 18);

  //const totals = calculateInvoiceTotals(items, taxPercent);

  /*
   * Discount is already applied to the service
   * amount because serviceAmount comes from
   * booking.pricing.finalPrice.
   *
   * We keep discountAmount for display/reporting.
   */
  const discountAmount = Number(booking.pricing?.discountAmount || 0);

  //const grandTotal = totals.grandTotal;

  //const invoiceNumber = generateInvoiceNumber();
  let invoiceNumber = "";
  let invoiceNumberExists = true;

  while (invoiceNumberExists) {
    invoiceNumber = generateInvoiceNumber();

    invoiceNumberExists = Boolean(
      await Invoice.exists({
        invoiceNumber,
      }),
    );
  }
  let invoice;
  try {
    invoice = await Invoice.create({
      invoiceNumber,
      jobId: job._id,

      bookingId: booking._id,

      customerId: booking.customerId,

      createdBy: job.assignedBy,

      status: "issued",

      currency: "INR",

      items,

      subtotal: totals.subtotal,

      discountAmount,

      taxPercent,

      taxAmount: totals.taxAmount,

      grandTotal: totals.grandTotal,

      amountPaid: 0,

      balanceDue: totals.grandTotal,

      notes: booking.notes || "",

      issuedAt: new Date(),

      finalizedAt: new Date(),

      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      )
    )
      throw error;
    const existingForJob = await Invoice.findOne({ jobId });
    if (!existingForJob) throw error;
    await attachInvoiceIfMissing(jobId, existingForJob._id);
    await prepareInvoiceFinance(existingForJob._id);
    return existingForJob;
  }

  /*
   * Attach invoice to job.
   */
  job.invoiceId = invoice._id;

  job.paymentStatus = "pending";

  await job.save();

  await prepareInvoiceFinance(invoice._id);

  return invoice;
}
