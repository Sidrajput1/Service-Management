import mongoose from "mongoose";
import Booking from "@/models/booking";
import Job from "@/models/job";
import Technician from "@/models/technician";
import { ApiAuthError } from "./auth";
import { generateSixDigitOtp } from "./otp";
import { commissionForBooking } from "./finance-commission";
import { canPerformService } from "./marketplace-policy.mjs";
import { getJobNotificationRecipients } from "./notification-recipents";
import { notifyJobAssigned } from "./notify-events";
import { ensureJobConversation } from "./chat/ensure-job-conversation";
import type { FinanceActor } from "./finance-ledger";
const active = [
  "scheduled",
  "assigned",
  "enroute",
  "arrived",
  "otp_verified",
  "in_progress",
  "on_hold",
];
export async function staffAssignJob(
  actor: FinanceActor,
  input: {
    bookingId?: string;
    jobId?: string;
    technicianId?: string;
    scheduledAt?: string;
    notes?: string | null;
    proofRequired?: boolean;
  },
) {
  if (!["admin", "dispatcher"].includes(actor.role))
    throw new ApiAuthError("Staff access required", 403);
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const existing = input.jobId
        ? await Job.findById(input.jobId).session(session)
        : null;
      if (input.jobId && !existing)
        throw new ApiAuthError("Job not found", 404);
      if (
        existing &&
        !["scheduled", "assigned", "enroute", "arrived"].includes(
          existing.status,
        )
      )
        throw new ApiAuthError(
          "Work already started or the job is closed. Use the review process instead of resetting its workflow.",
          409,
        );
      const booking = await Booking.findById(
        existing?.bookingId || input.bookingId,
      )
        .select("+commissionSnapshot")
        .session(session);
      if (!booking) throw new ApiAuthError("Booking not found", 404);
      if (
        !["confirmed", "assigned", "rescheduled"].includes(booking.status) ||
        !booking.serviceProviderId ||
        !booking.serviceOfferingId
      )
        throw new ApiAuthError(
          "This booking needs a valid current business, service and assignment before work can be assigned.",
          409,
        );
      if (
        !existing &&
        (await Job.exists({ bookingId: booking._id }).session(session))
      )
        throw new ApiAuthError("A job already exists for this booking", 409);
      if (
        existing &&
        String(existing.serviceProviderId) !== String(booking.serviceProviderId)
      )
        throw new ApiAuthError(
          "The job and booking business do not match",
          409,
        );
      const tech = input.technicianId
        ? await Technician.findOne({
            _id: input.technicianId,
            serviceProviderId: booking.serviceProviderId,
            isActive: { $ne: false },
            status: { $ne: "on_leave" },
          }).session(session)
        : null;
      if (input.technicianId && !tech)
        throw new ApiAuthError(
          "Choose an active Pro from this booking's business",
          409,
        );
      if (
        tech &&
        (await Job.exists({
          technicianId: tech._id,
          status: { $in: active },
          ...(existing ? { _id: { $ne: existing._id } } : {}),
        }).session(session))
      )
        throw new ApiAuthError("This Pro already has an active job", 409);
      if (
        tech &&
        (booking.requiredSkillKeys || []).length &&
        !canPerformService(tech.skillKeys, booking.requiredSkillKeys)
      )
        throw new ApiAuthError(
          "Choose a Pro with the service's required skills",
          409,
        );
      if (
        existing &&
        String(existing.technicianId) === String(tech?._id) &&
        existing.status === "assigned"
      )
        return { job: existing, booking, changed: false };
      if (!booking.commissionSnapshot)
        booking.commissionSnapshot = await commissionForBooking(
          booking.serviceProviderId,
          booking.serviceOfferingId,
          session,
        );
      const fence = await Booking.updateOne(
        { _id: booking._id, status: booking.status },
        { $inc: { __v: 1 } },
        { session },
      );
      if (fence.modifiedCount !== 1)
        throw new ApiAuthError(
          "Booking changed. Refresh before assigning.",
          409,
        );
      const oldTechId = existing?.technicianId,
        job =
          existing ||
          new Job({
            bookingId: booking._id,
            serviceProviderId: booking.serviceProviderId,
          });
      job.technicianId = tech?._id;
      job.assignedBy = actor._id;
      job.status = tech ? "assigned" : "scheduled";
      job.scheduledAt = input.scheduledAt
        ? new Date(input.scheduledAt)
        : booking.scheduledAt;
      if (input.notes !== undefined) job.notes = input.notes || undefined;
      if (input.proofRequired !== undefined)
        job.proofRequired = input.proofRequired;
      if (tech) {
        job.otp = generateSixDigitOtp();
        const expiry = new Date(
          Math.max(Date.now(), job.scheduledAt?.getTime() || 0),
        );
        expiry.setHours(23, 59, 59, 999);
        job.otpExpiresAt = expiry;
      }
      job.arrivedAt = undefined;
      job.acceptedAt = undefined;
      job.arrivalTracking = undefined;
      await job.save({ session });
      booking.status = tech ? "assigned" : "confirmed";
      booking.technicianId = tech?._id;
      await booking.save({ session });
      if (tech)
        await Technician.updateOne(
          { _id: tech._id },
          { $set: { status: "busy" } },
          { session },
        );
      if (
        oldTechId &&
        String(oldTechId) !== String(tech?._id) &&
        !(await Job.exists({
          technicianId: oldTechId,
          status: { $in: active },
          _id: { $ne: job._id },
        }).session(session))
      )
        await Technician.updateOne(
          { _id: oldTechId, status: "busy" },
          { $set: { status: "available" } },
          { session },
        );
      return { job, booking, changed: true };
    });
    if (!result) throw new ApiAuthError("Assignment did not complete", 409);
    if (result.changed && result.job.technicianId) {
      try {
        const recipients = await getJobNotificationRecipients(
          String(result.job._id),
        );
        if (recipients.technicianUserId)
          await notifyJobAssigned({
            technicianUserId: recipients.technicianUserId,
            customerUserId: recipients.customerUserId || undefined,
            providerUserId: recipients.providerUserId || undefined,
            jobId: String(result.job._id),
            bookingId: String(result.booking._id),
            serviceName: result.booking.serviceType,
          });
        await ensureJobConversation(String(result.job._id), actor);
      } catch {
        console.error(
          "Assignment saved; job notification or chat preparation can be retried.",
        );
      }
    }
    const { job } = result;
    return {
      job: {
        _id: job._id,
        bookingId: job.bookingId,
        technicianId: job.technicianId,
        serviceProviderId: job.serviceProviderId,
        status: job.status,
        scheduledAt: job.scheduledAt,
        proofRequired: job.proofRequired,
      },
    };
  } finally {
    await session.endSession();
  }
}
