import Booking, { type IBooking } from "@/models/booking";
import Invoice from "@/models/invoice";
import { generateInvoiceNumber } from "./generateInvoiceNumber";
import Job, { type IJob } from "@/models/job";
import mongoose from "mongoose";
import {
  ensureFinanceLedger,
  prepareInvoiceFinance,
} from "@/lib/finance-ledger";
import { unquotedCompletionPricing } from "@/lib/job-quote-pricing";
import {
  assertInvoiceMatchesJob,
  invoiceQuoteFields,
} from "@/lib/job-invoice-approval";
import { ApiAuthError } from "@/lib/auth";
import { invoicePromotionSnapshot } from "@/lib/invoice-breakdown";

export async function attachInvoiceIfMissing(
  jobId: mongoose.Types.ObjectId,
  invoiceId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) {
  await Job.updateOne(
    {
      _id: jobId,
      $or: [{ invoiceId: { $exists: false } }, { invoiceId: null }],
    },
    { $set: { invoiceId } },
    { session },
  );
}

export async function generateInvoiceForJob(
  jobId: mongoose.Types.ObjectId,
  transaction?: {
    job: IJob;
    booking: IBooking;
    session: mongoose.ClientSession;
  },
) {
  const job =
    transaction?.job ?? (await Job.findById(jobId).select("+finalQuote"));
  const session = transaction?.session;

  if (!job) {
    throw new ApiAuthError("Job not found", 404);
  }

  if (job.status !== "completed") {
    throw new ApiAuthError(
      "Invoice can only be generated after job completion",
      409,
    );
  }

  const existing = session
    ? await Invoice.findOne({ jobId }).session(session)
    : await Invoice.findOne({ jobId });
  if (existing && (existing.status !== "draft" || !transaction)) {
    if (existing.status === "draft") {
      throw new ApiAuthError(
        "A draft already exists. Finalize it from the saved job pricing in Billing.",
        409,
      );
    }
    if (
      job.finalQuote ||
      existing.quotePricingSource ||
      ["issued", "partial"].includes(existing.status)
    )
      await assertInvoiceMatchesJob(existing, job, session);
    await attachInvoiceIfMissing(jobId, existing._id, session);
    if (session) await ensureFinanceLedger(existing, session);
    else await prepareInvoiceFinance(existing._id);
    return existing;
  }

  const booking =
    transaction?.booking ?? (await Booking.findById(job.bookingId));

  if (!booking) {
    throw new ApiAuthError("Booking not found", 404);
  }

  const pricing =
    job.finalQuote ?? (await unquotedCompletionPricing(job, booking, session));
  const totals = invoiceQuoteFields(pricing);

  if (existing) {
    if (
      String(existing.bookingId) !== String(booking._id) ||
      String(existing.customerId) !== String(booking.customerId) ||
      existing.finalizedAt ||
      existing.amountPaid > 0 ||
      existing.razorpayCheckoutChannel ||
      existing.razorpayOrderId ||
      existing.razorpayPaymentLinkId
    )
      throw new ApiAuthError(
        "The draft invoice needs an administrative billing review.",
        409,
      );
    Object.assign(existing, totals, {
      finalizedAt: new Date(),
      status: totals.grandTotal === 0 ? "paid" : "issued",
      quotePricingSource: "job",
      balanceDue: totals.grandTotal,
      issuedAt: new Date(),
    });
    existing.appliedPromotion =
      invoicePromotionSnapshot(existing, booking.pricing) ?? null;
    await existing.save({ session });
    job.invoiceId = existing._id;
    job.paymentStatus = totals.grandTotal === 0 ? "not_required" : "pending";
    await job.save({ session });
    await ensureFinanceLedger(existing, session!);
    return existing;
  }

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
    const fields = {
      invoiceNumber,
      jobId: job._id,

      bookingId: booking._id,

      customerId: booking.customerId,

      createdBy: job.assignedBy,

      status: totals.grandTotal === 0 ? ("paid" as const) : ("issued" as const),

      currency: "INR",
      quotePricingSource: "job" as const,
      appliedPromotion:
        invoicePromotionSnapshot(
          { ...totals, quotePricingSource: "job" },
          booking.pricing,
        ) ?? null,
      ...totals,

      amountPaid: 0,

      balanceDue: totals.grandTotal,

      notes: booking.notes || "",

      issuedAt: new Date(),

      finalizedAt: new Date(),

      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    invoice = session
      ? (await Invoice.create([fields], { session }))[0]
      : await Invoice.create(fields);
  } catch (error) {
    if (session) throw error;
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
    if (!existingForJob || existingForJob.status === "draft") throw error;
    await assertInvoiceMatchesJob(existingForJob, job);
    await attachInvoiceIfMissing(jobId, existingForJob._id);
    await prepareInvoiceFinance(existingForJob._id);
    return existingForJob;
  }

  /*
   * Attach invoice to job.
   */
  job.invoiceId = invoice._id;

  job.paymentStatus = totals.grandTotal === 0 ? "not_required" : "pending";

  await job.save(session ? { session } : undefined);

  if (session) await ensureFinanceLedger(invoice, session);
  else await prepareInvoiceFinance(invoice._id);

  return invoice;
}
