import type { ClientSession } from "mongoose";
import type { IJob } from "@/models/job";
import type { IBooking } from "@/models/booking";
import { runningJobPricing } from "./job-quotes";
import { invoiceBreakdown } from "./invoice-breakdown";

export type RunningBill = {
  breakdown: ReturnType<typeof invoiceBreakdown>;
  partsVersion: number;
};
export async function jobRunningBill(
  job: Pick<
    IJob,
    "status" | "finalQuote" | "authorizedQuoteId" | "partsUsed" | "partsVersion"
  >,
  booking: Pick<
    IBooking,
    "pricing" | "estimatedPrice" | "serviceOfferingId" | "serviceType"
  >,
  session?: ClientSession,
): Promise<RunningBill | null> {
  if (!["in_progress", "on_hold"].includes(job.status)) return null;
  const pricing = await runningJobPricing(job, booking, session);
  return {
    partsVersion: job.partsVersion ?? 0,
    breakdown: invoiceBreakdown(
      { ...pricing, quotePricingSource: "job" },
      booking.pricing,
    ),
  };
}
