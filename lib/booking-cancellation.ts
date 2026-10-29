import { type ClientSession } from "mongoose";
import Booking from "@/models/booking";
import Job from "@/models/job";
import Customer from "@/models/customer";
import ServiceProvider from "@/models/ServiceProvider";
import Technician from "@/models/technician";
import { CancellationCase } from "@/models/finance";
import { financeTransaction, type FinanceActor } from "./finance-ledger";
import { validCancellationReason } from "./finance-policy.mjs";
import { ApiAuthError } from "./auth";
import { createNotification } from "./notification";

export async function cancellationContext(
  bookingId: string,
  actor: FinanceActor,
  session?: ClientSession,
) {
  const booking = await Booking.findById(bookingId).session(session || null);
  if (!booking) throw new ApiAuthError("Booking not found", 404);
  const job = await Job.findOne({
    bookingId: booking._id,
    serviceProviderId: booking.serviceProviderId,
  }).session(session || null);
  const provider = await ServiceProvider.findById(
    booking.serviceProviderId,
  ).session(session || null);
  let allowed = ["admin", "dispatcher"].includes(actor.role);
  if (actor.role === "customer")
    allowed = Boolean(
      await Customer.exists({
        _id: booking.customerId,
        userId: actor._id,
      }).session(session || null),
    );
  if (actor.role === "service_provider")
    allowed = Boolean(
      provider && String(provider.ownerId) === String(actor._id),
    );
  if (actor.role === "technician")
    allowed = Boolean(
      job &&
        String(job.technicianId) === String(booking.technicianId) &&
        (await Technician.exists({
          _id: job.technicianId,
          userId: actor._id,
          serviceProviderId: booking.serviceProviderId,
          isActive: { $ne: false },
        }).session(session || null)),
    );
  if (!allowed) throw new ApiAuthError("Booking not found", 404);
  return { booking, job, provider };
}
export function cancellationAllowed(
  bookingStatus: string,
  jobStatus: string | undefined,
  role: string,
) {
  if (
    bookingStatus === "cancelled" ||
    ["completed", "cancelled"].includes(jobStatus || "")
  )
    return false;
  if (["admin", "dispatcher"].includes(role)) return true;
  return (
    !jobStatus ||
    ["scheduled", "assigned", "enroute", "arrived"].includes(jobStatus)
  );
}
export async function cancelBooking(
  actor: FinanceActor,
  bookingId: string,
  input: { requestId: string; reason: string; note?: string },
) {
  if (!validCancellationReason(actor.role, input.reason))
    throw new ApiAuthError("Choose a cancellation reason for your role.", 400);
  return financeTransaction(
    actor,
    "booking_cancelled",
    input.requestId,
    { bookingId, ...input },
    async (session) => {
      const { booking, job } = await cancellationContext(
        bookingId,
        actor,
        session,
      );
      if (!cancellationAllowed(booking.status, job?.status, actor.role))
        throw new ApiAuthError(
          "This booking cannot be cancelled in its current state. Contact support for a review.",
          409,
        );
      const previousBookingStatus = booking.status,
        previousJobStatus = job?.status;
      const changed = await Booking.updateOne(
        {
          _id: booking._id,
          status: previousBookingStatus,
          serviceProviderId: booking.serviceProviderId,
        },
        { $set: { status: "cancelled" }, $inc: { __v: 1 } },
        { session },
      );
      if (changed.modifiedCount !== 1)
        throw new ApiAuthError(
          "The booking changed. Refresh before cancelling.",
          409,
        );
      if (job) {
        const changedJob = await Job.updateOne(
          { _id: job._id, status: previousJobStatus },
          {
            $set: { status: "cancelled" },
            $unset: { arrivalTracking: 1 },
            $inc: { arrivalVersion: 1 },
          },
          { session },
        );
        if (changedJob.modifiedCount !== 1)
          throw new ApiAuthError(
            "The job changed. Refresh before cancelling.",
            409,
          );
        if (
          job.technicianId &&
          !(await Job.exists({
            _id: { $ne: job._id },
            technicianId: job.technicianId,
            status: {
              $in: [
                "scheduled",
                "assigned",
                "enroute",
                "arrived",
                "otp_verified",
                "in_progress",
                "on_hold",
              ],
            },
          }).session(session))
        )
          await Technician.updateOne(
            { _id: job.technicianId, status: "busy" },
            { $set: { status: "available" } },
            { session },
          );
      }
      const [record] = await CancellationCase.create(
        [
          {
            bookingId: booking._id,
            jobId: job?._id,
            providerId: booking.serviceProviderId,
            customerId: booking.customerId,
            technicianId: job?.technicianId,
            actorId: actor._id,
            actorRole: actor.role,
            reason: input.reason,
            note: input.note,
            previousBookingStatus,
            previousJobStatus,
            cancelledAt: new Date(),
            reviewStatus: "open",
          },
        ],
        { session },
      );
      return {
        result: { cancelled: true, caseId: record._id },
        event: {
          resourceId: record._id,
          providerId: booking.serviceProviderId,
          reason: input.note,
          details: {
            bookingId: booking._id,
            jobId: job?._id,
            reason: input.reason,
            previousBookingStatus,
            previousJobStatus,
            noCommissionDebtCreated: true,
          },
        },
      };
    },
  );
}
export async function cancellationFeedback(
  actor: FinanceActor,
  bookingId: string,
  input: {
    requestId: string;
    answer: "yes" | "no" | "not_sure" | "prefer_not";
    note?: string;
  },
) {
  if (actor.role !== "customer")
    throw new ApiAuthError("Only the customer can provide this feedback.", 403);
  return financeTransaction(
    actor,
    "cancellation_feedback",
    input.requestId,
    { bookingId, ...input },
    async (session) => {
      const { booking } = await cancellationContext(bookingId, actor, session);
      const record = await CancellationCase.findOne({
        bookingId: booking._id,
      }).session(session);
      if (!record) throw new ApiAuthError("No cancellation record found", 404);
      if (record.feedbackAt)
        throw new ApiAuthError(
          "Feedback was already saved for this cancellation.",
          409,
        );
      record.feedback = input.answer;
      record.feedbackNote = input.note;
      record.feedbackAt = new Date();
      if (input.answer === "yes") record.reviewStatus = "open";
      await record.save({ session });
      return {
        result: { saved: true },
        event: {
          resourceId: record._id,
          providerId: record.providerId,
          details: {
            answer: input.answer,
            reportRequiresReview: input.answer === "yes",
            noAutomaticPenalty: true,
          },
        },
      };
    },
  );
}
export async function notifyCancellation(bookingId: string, key: string) {
  try {
    const booking = await Booking.findById(bookingId)
      .select("customerId serviceProviderId")
      .lean();
    if (!booking) return;
    const customer = await Customer.findById(booking.customerId)
        .select("userId")
        .lean(),
      provider = await ServiceProvider.findById(booking.serviceProviderId)
        .select("ownerId")
        .lean();
    for (const [id, url] of [
      [customer?.userId, `/customer/bookings/${bookingId}`],
      [provider?.ownerId, `/service-provider/bookings/${bookingId}`],
    ] as const)
      if (id)
        await createNotification({
          recipientUserId: String(id),
          title: "Booking cancelled",
          message:
            "This booking was cancelled. Review the reason and saved details in your account. A cancellation does not confirm a payment or refund.",
          type: "booking",
          entityType: "booking",
          entityId: bookingId,
          actionUrl: url,
          dedupeKey: `booking-cancelled:${key}:${id}`,
          channel: "in_app",
        });
    const job = await Job.findOne({ bookingId: booking._id })
      .select("technicianId")
      .lean();
    const tech = job?.technicianId
      ? await Technician.findById(job.technicianId).select("userId").lean()
      : null;
    if (tech?.userId)
      await createNotification({
        recipientUserId: String(tech.userId),
        title: "Booking cancelled",
        message:
          "The booking was cancelled. Stop travelling and review the saved job details.",
        type: "job",
        actionUrl: `/technician/all-jobs/${job!._id}`,
        dedupeKey: `booking-cancelled:${key}:${tech.userId}`,
        channel: "in_app",
      });
  } catch {
    console.error(
      "Cancellation saved; in-app notification delivery can be retried.",
    );
  }
}
