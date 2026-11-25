import { z } from "zod";
import { requireRole, ApiAuthError } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { withAssignedJob } from "@/lib/assigned-job-transaction";
import { requireTechnicianProfile } from "@/lib/technician";
import Booking from "@/models/booking";
import Technician from "@/models/technician";
import Invoice from "@/models/invoice";
import { FinanceLedger, FinanceEvent } from "@/models/finance";
import {
  notifyInvoiceIssued,
  notifyServiceCompleted,
} from "@/lib/notify-events";
import { generateInvoiceForJob } from "@/lib/billing/generateInvoiceForJob";
import { getJobNotificationRecipients } from "@/lib/notification-recipents";
import { pricingForCompletion } from "@/lib/job-quotes";
import { proHasReservations } from "@/lib/job-scheduling";
import { requireFinanceReady } from "@/lib/finance-readiness";
import { invoiceCanStartCheckout } from "@/lib/invoice-online-payment";

const completeSchema = z
  .object({
    paymentMode: z.enum(["cash", "direct_upi", "servizato_online"]).optional(),
    collected: z.boolean().default(false),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["technician"]);
    const { tech, user } = await requireTechnicianProfile();
    const { id } = await params;
    const body = await request.text();
    const input = completeSchema.parse(body ? JSON.parse(body) : {});
    await requireFinanceReady();
    await Invoice.init();
    const { job, booking, invoice } = await withAssignedJob(
      id,
      String(tech._id),
      async ({ job, booking, session }) => {
        if (!["in_progress", "on_hold", "completed"].includes(job.status))
          throw new ApiAuthError(
            "Job must be in progress before completion",
            400,
          );
        const transitioned = job.status !== "completed";
        if (transitioned) {
          if (job.proofRequired && !job.proofIds?.length)
            throw new ApiAuthError(
              "Proof is required before completing the job",
              400,
            );
          const existing = await Invoice.findOne({ jobId: job._id }).session(
            session,
          );
          if (existing && existing.status !== "draft")
            throw new ApiAuthError(
              "This job already has an issued invoice. Ask support to review the service status.",
              409,
            );
          const savedMode = booking.paymentMethod || job.paymentMethod;
          const mode = savedMode || input.paymentMode;
          if (
            !mode ||
            !["cash", "direct_upi", "servizato_online"].includes(mode)
          )
            throw new ApiAuthError(
              "Choose the payment method before completing this service.",
              400,
            );
          if (savedMode && input.paymentMode && input.paymentMode !== savedMode)
            throw new ApiAuthError(
              "The payment method changed. Refresh the booking before completing it.",
              409,
            );
          if (mode === "servizato_online" && input.collected)
            throw new ApiAuthError(
              "Online payments are confirmed by Razorpay.",
              400,
            );
          job.finalQuote = await pricingForCompletion(job, booking, session);
          job.status = "completed";
          job.endTime = new Date();
          job.paymentMethod = mode;
          await job.save({ session });
        }
        const invoice = await generateInvoiceForJob(job._id, {
          job,
          booking,
          session,
        });
        if (transitioned) {
          invoice.completionBilling = true;
          invoice.paymentMethod = job.paymentMethod;
          await invoice.save({ session });
          const row = await FinanceLedger.findOne({
            invoiceId: invoice._id,
          }).session(session);
          if (!row || row.billState !== "not_submitted")
            throw new ApiAuthError(
              "The saved bill needs an administrative review before completion.",
              409,
            );
          row.paymentMode = job.paymentMethod as
            | "cash"
            | "direct_upi"
            | "servizato_online";
          row.billState = "pending";
          row.claimedCollectedPaise = input.collected ? row.grossPaise : 0;
          row.paymentState =
            row.grossPaise === 0
              ? "not_required"
              : input.collected
                ? "claimed"
                : "unpaid";
          row.submittedBy = user._id;
          row.submittedAt = new Date();
          await row.save({ session });
          await FinanceEvent.updateOne(
            { dedupeKey: `completion-bill:${invoice._id}` },
            {
              $setOnInsert: {
                kind: "bill_submitted",
                actorId: user._id,
                actorRole: "technician",
                invoiceId: invoice._id,
                ledgerId: row._id,
                providerId: job.serviceProviderId,
                details: {
                  invoiceVersion: row.invoiceVersion,
                  paymentMode: row.paymentMode,
                  grossPaise: row.grossPaise,
                  claimedCollectedPaise: row.claimedCollectedPaise,
                  source: "job_completion",
                },
              },
            },
            { upsert: true, session },
          );
          await Booking.updateOne(
            { _id: booking._id },
            { $set: { paymentMethod: job.paymentMethod } },
            { session },
          );
          const counted = await Technician.updateOne(
            { _id: tech._id, isActive: { $ne: false } },
            { $inc: { jobsCompleted: 1 } },
            { session },
          );
          if (counted.matchedCount !== 1)
            throw new ApiAuthError(
              "Active Pro profile changed. Refresh before continuing.",
              409,
            );
          if (!(await proHasReservations(tech._id, session)))
            await Technician.updateOne(
              { _id: tech._id, status: "busy" },
              { $set: { status: "available" } },
              { session },
            );
        }
        return { job, booking, invoice };
      },
    );
    try {
      const recipients = await getJobNotificationRecipients(String(job._id));
      const canPayOnline = await invoiceCanStartCheckout(invoice);
      await Promise.all([
        notifyServiceCompleted({
          customerUserId: recipients.customerUserId || undefined,
          providerUserId: recipients.providerUserId || undefined,
          technicianUserId: recipients.technicianUserId || undefined,
          jobId: String(job._id),
          bookingId: String(job.bookingId),
          serviceName: booking.serviceType,
        }),
        notifyInvoiceIssued({
          customerUserId: recipients.customerUserId || undefined,
          providerUserId: recipients.providerUserId || undefined,
          invoiceId: String(invoice._id),
          bookingId: String(booking._id),
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.balanceDue,
          canPayOnline,
        }),
      ]);
    } catch {
      console.error("Completion saved. Notification delivery failed.");
    }
    return privateJson({
      success: true,
      job: { id: job._id, status: job.status, invoiceId: invoice._id },
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        grandTotal: invoice.grandTotal,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
