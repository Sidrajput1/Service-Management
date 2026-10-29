import mongoose, { type ClientSession } from "mongoose";
import Job, { type IJob } from "@/models/job";
import Booking from "@/models/booking";
import Technician from "@/models/technician";
import { ApiAuthError } from "./auth";
import { objectIdSchema } from "./pagination";

/** Serialize an assigned Pro's mutation with booking cancellation/reassignment. */
export async function withAssignedJob<T>(
  jobId: string,
  technicianId: string,
  operation: (value: { job: IJob; session: ClientSession }) => Promise<T>,
): Promise<T> {
  objectIdSchema.parse(jobId);
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const job = await Job.findOne({ _id: jobId, technicianId })
        .select("+otp +otpExpiresAt")
        .session(session);
      if (!job) throw new ApiAuthError("Assigned job not found", 404);
      const tech = await Technician.findOne({
        _id: technicianId,
        isActive: { $ne: false },
      })
        .select("_id")
        .session(session);
      if (!tech) throw new ApiAuthError("Active Pro access required", 403);
      const booking = await Booking.findOne({
        _id: job.bookingId,
        serviceProviderId: job.serviceProviderId,
        technicianId,
        status: "assigned",
      })
        .select("_id")
        .session(session);
      if (!booking)
        throw new ApiAuthError(
          "This booking is cancelled, reassigned or no longer active. Refresh before continuing.",
          409,
        );
      const fenced = await Booking.updateOne(
        {
          _id: booking._id,
          technicianId,
          status: "assigned",
        },
        { $inc: { __v: 1 } },
        { session },
      );
      if (fenced.matchedCount !== 1)
        throw new ApiAuthError(
          "The booking assignment changed. Refresh before continuing.",
          409,
        );
      return operation({ job, session });
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
