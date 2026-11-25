import type { ClientSession, Types } from "mongoose";
import { z } from "zod";
import Job, { type IJob } from "@/models/job";
import Booking, { type IBooking } from "@/models/booking";
import JobQuote, {
  type JobQuoteData,
  type QuotePricing,
} from "@/models/job-quote";
import Customer from "@/models/customer";
import { withAssignedJob } from "./assigned-job-transaction";
import { ApiAuthError } from "./auth";
import { requestHash } from "./finance-security";
import { requestIdSchema } from "./finance-validation";
import { paise } from "./finance-policy.mjs";
import {
  additionalChargeSchema,
  bookingQuote,
  priceRevisedQuote,
  requiresCustomerApproval,
} from "./job-quote-pricing";
import { notifyJobQuote } from "./notify-events";
import { calculateInvoiceTotals } from "./billing/invoice-totals";
import { getJobNotificationRecipients } from "./notification-recipents";

export const submitQuoteSchema = z
  .object({
    requestId: requestIdSchema,
    charges: z.array(additionalChargeSchema).max(100),
    partsDraftVersion: z.number().int().nonnegative(),
    expectedVersion: z.number().int().nonnegative(),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

export const decideQuoteSchema = z
  .object({
    version: z.number().int().positive(),
    decision: z.enum(["approve", "reject"]),
  })
  .strict();

const quoteOpenStatuses = [
  "assigned",
  "enroute",
  "arrived",
  "otp_verified",
  "in_progress",
  "on_hold",
];

function quoteDto(quote: JobQuoteData) {
  return {
    version: quote.version,
    status: quote.status,
    pricing: quote.pricing,
    previousApprovedAmount: quote.previousApprovedAmount,
    delta: quote.delta,
    reason: quote.reason,
    submittedAt: quote.submittedAt,
    decidedAt: quote.decidedAt,
    approvalSource: quote.approvalSource,
  };
}

async function readQuote(id?: string, session?: ClientSession) {
  if (!id) return null;
  const quote = await JobQuote.findById(id)
    .session(session ?? null)
    .lean();
  if (!quote)
    throw new ApiAuthError(
      "Quote history is unavailable. Ask support for help.",
      409,
    );
  return quote;
}

export async function quoteSummary(
  job: Pick<IJob, "latestQuoteId" | "authorizedQuoteId">,
) {
  const latest = await readQuote(job.latestQuoteId);
  const authorized =
    job.authorizedQuoteId === job.latestQuoteId
      ? latest
      : await readQuote(job.authorizedQuoteId);
  return {
    latest: latest ? quoteDto(latest) : null,
    authorized: authorized ? quoteDto(authorized) : null,
  };
}

export async function providerQuoteView(job: IJob, booking: IBooking) {
  const summary = await quoteSummary(job);
  const explicit =
    summary.authorized?.approvalSource === "customer"
      ? summary.authorized
      : job.customerApprovedQuoteId
        ? await readQuote(job.customerApprovedQuoteId)
        : null;
  const initial = await bookingQuote(booking);
  return {
    ...summary,
    canSubmit:
      booking.status === "assigned" && quoteOpenStatuses.includes(job.status),
    approvedAmount: explicit?.pricing.grandTotal ?? initial.approvedPayable,
    partsDraftVersion: job.partsDraftVersion ?? 0,
    draftParts: (job.partsUsed ?? [])
      .filter((part) => part.source !== "on_site")
      .map(({ partName, qty, price }) => ({
        chargeType: "part" as const,
        description: partName,
        qty,
        unitPrice: price ?? 0,
      })),
    base: initial.pricing,
  };
}

async function deliverDecision(
  jobId: string,
  bookingId: string,
  quote: JobQuoteData,
) {
  try {
    const recipients = await getJobNotificationRecipients(jobId);
    await notifyJobQuote({
      jobId,
      bookingId,
      version: quote.version,
      status: quote.status,
      customerUserId: recipients.customerUserId,
      providerUserId: recipients.providerUserId,
    });
  } catch {
    console.error("Quote saved. Notification delivery failed.");
  }
}

export async function submitJobQuote(
  jobId: string,
  providerId: Types.ObjectId,
  actorId: Types.ObjectId,
  input: z.infer<typeof submitQuoteSchema>,
) {
  const owned = await Job.findOne({ _id: jobId, serviceProviderId: providerId })
    .select("technicianId")
    .lean();
  if (!owned?.technicianId)
    throw new ApiAuthError("Assigned job not found", 404);
  // Initialize outside the transaction that writes the booking and job too.
  await JobQuote.init();
  const { requestId, ...command } = input;
  const id = `${jobId}:${requestId}`;
  const hash = requestHash(command);
  const result = await withAssignedJob(
    jobId,
    String(owned.technicianId),
    async ({ job, booking, session }) => {
      if (String(job.serviceProviderId) !== String(providerId))
        throw new ApiAuthError("Assigned job not found", 404);
      const replay = await JobQuote.findById(id).session(session).lean();
      if (replay) {
        if (replay.requestHash !== hash)
          throw new ApiAuthError(
            "This submission was already used for different details.",
            409,
          );
        return {
          quote: replay,
          changed: false,
          bookingId: String(booking._id),
        };
      }
      if (!quoteOpenStatuses.includes(job.status))
        throw new ApiAuthError(
          "This service is closed for quote changes.",
          409,
        );
      if ((job.quoteVersion ?? 0) !== input.expectedVersion)
        throw new ApiAuthError(
          "A newer quote is available. Refresh and review it first.",
          409,
        );
      if ((job.partsDraftVersion ?? 0) !== input.partsDraftVersion)
        throw new ApiAuthError(
          "The Pro changed the draft parts. Refresh and review them before submitting.",
          409,
        );
      const latest = await readQuote(job.latestQuoteId, session);
      const previous = await readQuote(job.customerApprovedQuoteId, session);
      const initial = await bookingQuote(booking, session);
      const approvedAmount =
        previous?.pricing.grandTotal ?? initial.approvedPayable;
      const pricing = priceRevisedQuote(initial.pricing, input.charges);
      const pending = requiresCustomerApproval(
        pricing.grandTotal,
        approvedAmount,
      );
      if (latest?.status === "pending_customer_approval")
        await JobQuote.updateOne(
          { _id: latest._id, status: "pending_customer_approval" },
          { $set: { status: "superseded", decidedAt: new Date() } },
          { session },
        );
      const quote: JobQuoteData = {
        _id: id,
        jobId: job._id as Types.ObjectId,
        version: (job.quoteVersion ?? 0) + 1,
        status: pending ? "pending_customer_approval" : "approved",
        pricing,
        previousApprovedAmount: approvedAmount,
        delta:
          approvedAmount === null
            ? null
            : (paise(pricing.grandTotal) - paise(approvedAmount)) / 100,
        reason: input.reason,
        createdBy: actorId,
        submittedAt: new Date(),
        approvalSource: pending ? undefined : "within_approved_total",
        requestHash: hash,
        partsDraftVersion: input.partsDraftVersion,
      };
      await JobQuote.create([quote], { session });
      job.quoteVersion = quote.version;
      job.latestQuoteId = id;
      if (!pending) {
        job.authorizedQuoteId = id;
        job.quotedPartsDraftVersion = job.partsDraftVersion ?? 0;
      }
      await job.save({ session });
      return { quote, changed: true, bookingId: String(booking._id) };
    },
  );
  if (result.quote.status === "pending_customer_approval")
    await deliverDecision(jobId, result.bookingId, result.quote);
  return { quote: quoteDto(result.quote), duplicate: !result.changed };
}

export async function decideJobQuote(
  bookingId: string,
  customerUserId: Types.ObjectId,
  input: z.infer<typeof decideQuoteSchema>,
) {
  const customer = await Customer.findOne({ userId: customerUserId })
    .select("_id")
    .lean();
  const booking =
    customer &&
    (await Booking.findOne({ _id: bookingId, customerId: customer._id })
      .select("technicianId serviceProviderId")
      .lean());
  const scoped =
    booking?.technicianId &&
    (await Job.findOne({
      bookingId,
      serviceProviderId: booking.serviceProviderId,
      technicianId: booking.technicianId,
    })
      .select("_id")
      .lean());
  if (!customer || !booking?.technicianId || !scoped)
    throw new ApiAuthError("Booking quote not found", 404);
  const jobId = String(scoped._id);
  const result = await withAssignedJob(
    jobId,
    String(booking.technicianId),
    async ({ job, booking: owned, session }) => {
      if (String(owned.customerId) !== String(customer._id))
        throw new ApiAuthError("Booking quote not found", 404);
      const latest = await readQuote(job.latestQuoteId, session);
      if (!latest || latest.version !== input.version)
        throw new ApiAuthError(
          "This quote changed. Refresh and review the latest revision.",
          409,
        );
      const status = input.decision === "approve" ? "approved" : "rejected";
      if (
        latest.status === status &&
        String(latest.decidedBy) === String(customerUserId)
      )
        return { quote: latest, changed: false };
      if (
        !quoteOpenStatuses.includes(job.status) ||
        latest.status !== "pending_customer_approval"
      )
        throw new ApiAuthError("This quote is closed for a response.", 409);
      if (
        input.decision === "approve" &&
        latest.partsDraftVersion !== (job.partsDraftVersion ?? 0)
      )
        throw new ApiAuthError(
          "The draft parts changed. Ask your provider to send the current quote.",
          409,
        );
      const decision = {
        status,
        decidedBy: customerUserId,
        decidedAt: new Date(),
        ...(status === "approved"
          ? { approvalSource: "customer" as const }
          : {}),
      } as const;
      const updated = await JobQuote.updateOne(
        { _id: latest._id, status: "pending_customer_approval" },
        { $set: decision },
        { session },
      );
      if (updated.matchedCount !== 1)
        throw new ApiAuthError(
          "This quote changed. Refresh and review it.",
          409,
        );
      if (status === "approved") {
        job.customerApprovedQuoteId = latest._id;
        job.authorizedQuoteId = latest._id;
      }
      // An edit made after submission still needs review even if this revision is decided.
      job.quotedPartsDraftVersion = latest.partsDraftVersion;
      await job.save({ session });
      return { quote: { ...latest, ...decision }, changed: true };
    },
  );
  await deliverDecision(jobId, bookingId, result.quote);
  return { quote: quoteDto(result.quote), duplicate: !result.changed };
}

export async function pricingForCompletion(
  job: IJob,
  booking: IBooking,
  session?: ClientSession,
): Promise<QuotePricing> {
  if (job.finalQuote) return job.finalQuote;
  const latest = await readQuote(job.latestQuoteId, session);
  if (latest?.status === "pending_customer_approval")
    throw new ApiAuthError(
      "Wait for the customer to respond or ask your provider to revise the pending quote before completing the job.",
      409,
    );
  if (
    (job.partsDraftVersion ?? 0) > (job.quotedPartsDraftVersion ?? 0) ||
    (!job.latestQuoteId &&
      job.partsUsed?.some(
        (part) => part.source !== "on_site" && Number(part.price) > 0,
      ))
  )
    throw new ApiAuthError(
      "Ask your service provider to review the draft charges before completing the job.",
      409,
    );
  const authorized = await readQuote(job.authorizedQuoteId, session);
  if (authorized?.status === "approved")
    return addOnsiteParts(authorized.pricing, job);
  const base = await bookingQuote(booking, session);
  if (requiresCustomerApproval(base.pricing.grandTotal, base.approvedPayable))
    throw new ApiAuthError(
      "This booking needs customer approval of its payable amount before it can be billed.",
      409,
    );
  return addOnsiteParts(base.pricing, job);
}

function addOnsiteParts(
  base: QuotePricing,
  job: Pick<IJob, "partsUsed">,
): QuotePricing {
  const parts = (job.partsUsed ?? []).filter(
    (part) => part.source === "on_site",
  );
  if (!parts.length) return base;
  const items = [
    ...base.items,
    ...parts.map((part) => {
      const charge = additionalChargeSchema.parse({
        chargeType: "part",
        description: part.partName,
        qty: part.qty,
        unitPrice: part.price,
      });
      return {
        ...charge,
        itemType: "part" as const,
        taxable: true,
        amount: charge.qty * charge.unitPrice,
      };
    }),
  ];
  const totals = calculateInvoiceTotals(items, base.taxPercent);
  if (!Number.isSafeInteger(paise(totals.grandTotal)))
    throw new ApiAuthError(
      "The running bill exceeds the supported amount.",
      409,
    );
  return { ...base, items, ...totals };
}

/** Provider revisions remain separate from parts recorded during active work. */
export async function runningJobPricing(
  job: Pick<IJob, "finalQuote" | "authorizedQuoteId" | "partsUsed">,
  booking: Pick<
    IBooking,
    "pricing" | "estimatedPrice" | "serviceOfferingId" | "serviceType"
  >,
  session?: ClientSession,
): Promise<QuotePricing> {
  if (job.finalQuote) return job.finalQuote;
  const authorized = await readQuote(job.authorizedQuoteId, session);
  const base =
    authorized?.status === "approved"
      ? authorized.pricing
      : (await bookingQuote(booking, session)).pricing;
  return addOnsiteParts(base, job);
}
