import type { ClientSession } from "mongoose";
import Booking from "@/models/booking";
import Job, { type IJob } from "@/models/job";
import type { IInvoice, IInvoiceItem } from "@/models/invoice";
import type { QuotePricing } from "@/models/job-quote";
import { ApiAuthError } from "./auth";
import { bookingQuote, unquotedCompletionPricing } from "./job-quote-pricing";
import { paise } from "./finance-policy.mjs";

type InvoicePrice = Pick<
  IInvoice,
  "grandTotal" | "taxAmount" | "discountAmount" | "taxPercent" | "items"
>;

export function invoiceQuoteFields(pricing: QuotePricing) {
  const { items, subtotal, discountAmount, taxPercent, taxAmount, grandTotal } =
    pricing;
  return { items, subtotal, discountAmount, taxPercent, taxAmount, grandTotal };
}

export async function invoicePricingForJob(job: IJob, session?: ClientSession) {
  if (job.status !== "completed")
    throw new ApiAuthError(
      "The service must be completed before issuing its invoice.",
      409,
    );
  if (job.finalQuote) return job.finalQuote;
  const booking = await Booking.findById(job.bookingId).session(
    session ?? null,
  );
  if (!booking) throw new ApiAuthError("Booking not found", 404);
  return unquotedCompletionPricing(job, booking, session);
}

function sameLine(actual: IInvoiceItem, expected: IInvoiceItem) {
  return (
    actual.itemType === expected.itemType &&
    actual.description === expected.description &&
    actual.qty === expected.qty &&
    actual.unitPrice === expected.unitPrice &&
    actual.amount === expected.amount &&
    (actual.taxable !== false) === (expected.taxable !== false)
  );
}

function assertSnapshot(invoice: InvoicePrice, authorized: QuotePricing) {
  if (
    paise(invoice.grandTotal) !== paise(authorized.grandTotal) ||
    paise(invoice.taxAmount) !== paise(authorized.taxAmount) ||
    paise(invoice.discountAmount) !== paise(authorized.discountAmount) ||
    invoice.taxPercent !== authorized.taxPercent ||
    invoice.items.length !== authorized.items.length ||
    !invoice.items.every((item, index) =>
      sameLine(item, authorized.items[index]),
    )
  )
    throw new ApiAuthError(
      "This invoice must use the completed job's authorized quote.",
      409,
    );
}

export async function assertInvoiceMatchesJob(
  invoice: Pick<IInvoice, "jobId" | "quotePricingSource"> &
    InvoicePrice &
    Partial<Pick<IInvoice, "balanceDue" | "bookingId">>,
  job?: IJob | null,
  session?: ClientSession,
) {
  if (!invoice.jobId) return;
  const current =
    job ??
    (await Job.findById(invoice.jobId)
      .select("+finalQuote")
      .session(session ?? null));
  if (!current || current.status !== "completed")
    throw new ApiAuthError(
      "The service must be completed before its invoice can be paid.",
      409,
    );
  if (
    invoice.bookingId &&
    String(invoice.bookingId) !== String(current.bookingId)
  )
    throw new ApiAuthError(
      "The invoice and booking references need reconciliation.",
      409,
    );
  if (
    invoice.balanceDue != null &&
    paise(invoice.balanceDue) > paise(invoice.grandTotal)
  )
    throw new ApiAuthError(
      "The invoice balance needs reconciliation before payment.",
      409,
    );
  if (current.finalQuote) assertSnapshot(invoice, current.finalQuote);
  else if (invoice.quotePricingSource === "job")
    assertSnapshot(invoice, await invoicePricingForJob(current, session));
  else {
    const booking = await Booking.findById(current.bookingId).session(
      session ?? null,
    );
    if (!booking)
      throw new ApiAuthError("The booking needs a billing review.", 409);
    const disclosed = (await bookingQuote(booking, session)).approvedPayable;
    if (disclosed === null || paise(invoice.grandTotal) > paise(disclosed))
      throw new ApiAuthError(
        "The legacy invoice needs a recorded approved amount. Ask support to review it.",
        409,
      );
  }
}

export async function assertJobBillCorrection(
  invoice: IInvoice,
  next: InvoicePrice,
  session: ClientSession,
) {
  if (!invoice.jobId) return;
  const job = await Job.findById(invoice.jobId)
    .select("+finalQuote")
    .session(session);
  if (job?.finalQuote || invoice.quotePricingSource === "job") {
    await assertInvoiceMatchesJob(
      {
        jobId: invoice.jobId,
        quotePricingSource: invoice.quotePricingSource,
        ...next,
      },
      job,
      session,
    );
    return;
  }
  const booking =
    job && (await Booking.findById(job.bookingId).session(session));
  const disclosed = booking
    ? (await bookingQuote(booking, session)).approvedPayable
    : null;
  const limit = Math.min(
    paise(invoice.grandTotal),
    disclosed === null ? Infinity : paise(disclosed),
  );
  if (paise(next.grandTotal) > limit)
    throw new ApiAuthError(
      "This correction exceeds the recorded approved amount. Use the billing review process.",
      409,
    );
}
