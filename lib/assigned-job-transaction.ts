import mongoose, { type ClientSession } from "mongoose";
import Job, { type IJob } from "@/models/job";
import Booking, { type IBooking } from "@/models/booking";
import Technician from "@/models/technician";
import { jobOtpSelect } from "./job-start-otp";
import { ApiAuthError } from "./auth";
import { objectIdSchema } from "./pagination";

/** Serialize an assigned Pro's mutation with booking cancellation/reassignment. */
export async function withAssignedJob<T>(
  jobId: string,
  technicianId: string,
  operation: (value: { job: IJob; booking: IBooking; session: ClientSession }) => Promise<T>,
): Promise<T> {
  objectIdSchema.parse(jobId);
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const job = await Job.findOne({ _id: jobId, technicianId })
        .select(jobOtpSelect)
        .select("+finalQuote")
        .session(session);
      if (!job) throw new ApiAuthError("Assigned job not found", 404);
      const tech = await Technician.findOne({
        _id: technicianId,
        serviceProviderId: job.serviceProviderId,
        isActive: { $ne: false },
      }).select("_id").session(session);
      if (!tech) throw new ApiAuthError("Active Pro access required", 403);
      const booking = await Booking.findOne({
        _id: job.bookingId,
        serviceProviderId: job.serviceProviderId,
        technicianId,
        status: "assigned",
      })
        .select("serviceType serviceOfferingId customerId pricing estimatedPrice notes paymentMethod")
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
      return operation({ job, booking, session });
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
