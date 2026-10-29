import mongoose from "mongoose";
import Job from "@/models/job";
import Booking from "@/models/booking";
import Customer from "@/models/customer";
import Technician from "@/models/technician";
import { ApiAuthError } from "./auth";
import { connectToDb } from "./db";
import { confirmedDestination, destinationKey } from "./service-location.mjs";
import {
  arrivalConfig,
  defaultArrivalConfig,
  evaluateArrival,
  readingIssue,
} from "./arrival-policy.mjs";
import { deliverArrival, emitArrivalStatus } from "./arrival-delivery";
import type { z } from "zod";
import type { gpsReadingSchema } from "./location-validation";
type Reading = z.infer<typeof gpsReadingSchema>;
/** Both manual and GPS arrival share the same state transition and durable side effect. */
export async function recordJobArrival(
  jobId: string,
  technicianId: string,
  userId: string,
  reading?: Reading,
) {
  await connectToDb();
  let config = defaultArrivalConfig;
  if (reading) {
    try {
      config = arrivalConfig(process.env);
    } catch {
      throw new ApiAuthError(
        "Automatic arrival is temporarily unavailable. Use manual arrival.",
        503,
      );
    }
  }
  if (reading && readingIssue(reading, Date.now(), config))
    throw new ApiAuthError("Submit a fresh, valid location observation.", 400);
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const tech = await Technician.findOne({
        _id: technicianId,
        userId,
        isActive: { $ne: false },
        status: { $nin: ["offline", "on_leave"] },
      })
        .session(session)
        .select("_id");
      if (!tech)
        throw new ApiAuthError("Active assigned Pro access required.", 403);
      const job = await Job.findOne({ _id: jobId, technicianId })
        .select("+arrivalTracking +arrivalNotification")
        .session(session);
      if (!job) throw new ApiAuthError("Assigned job not found.", 404);
      const booking = await Booking.findOne({
        _id: job.bookingId,
        serviceProviderId: job.serviceProviderId,
      })
        .select(
          "status customerId technicianId address.addressLine address.locality address.city address.state address.pincode +address.location +address.locationConfirmation",
        )
        .session(session);
      if (
        !booking ||
        booking.status !== "assigned" ||
        String(booking.technicianId) !== technicianId
      )
        throw new ApiAuthError(
          "This booking is no longer an active assigned journey.",
          409,
        );
      if (job.status === "arrived" && job.arrivedAt)
        return { status: "arrived", state: "arrived", transitioned: false };
      if (job.status !== "enroute" || job.arrivedAt)
        throw new ApiAuthError(
          "This job is no longer eligible for arrival observation.",
          409,
        );
      const version = job.arrivalVersion || 0,
        versionFilter = version
          ? { arrivalVersion: version }
          : {
              $or: [
                { arrivalVersion: 0 },
                { arrivalVersion: { $exists: false } },
              ],
            };
      let tracking,
        arrived = !reading,
        state = "arrived";
      if (reading) {
        const destination = confirmedDestination(booking.address);
        if (!destination)
          throw new ApiAuthError(
            "A customer-confirmed destination is unavailable. Use manual arrival.",
            409,
          );
        const evaluation = evaluateArrival(
          job.arrivalTracking,
          reading,
          destination,
          Date.now(),
          destinationKey(booking.address),
          technicianId,
          config,
        );
        if (evaluation.error)
          throw new ApiAuthError(
            evaluation.error === "rate_limited"
              ? "Location updates are too frequent."
              : "This observation is stale or out of order.",
            evaluation.error === "rate_limited" ? 429 : 400,
          );
        tracking = evaluation.tracking;
        arrived = Boolean(evaluation.arrived);
        state = evaluation.state || "waiting";
      }
      // Serialize with cancellation, destination edits, and reassignment of this booking.
      const fenced = await Booking.updateOne(
        { _id: booking._id, status: "assigned", technicianId },
        { $inc: { __v: 1 } },
        { session },
      );
      if (!fenced.matchedCount)
        throw new ApiAuthError(
          "This booking changed. Refresh before arrival.",
          409,
        );
      const customer = arrived
        ? await Customer.findById(booking.customerId)
            .select("userId")
            .session(session)
        : null;
      const updated = await Job.findOneAndUpdate(
        { _id: jobId, technicianId, status: "enroute", ...versionFilter },
        arrived
          ? {
              $set: {
                status: "arrived",
                arrivedAt: new Date(),
                arrivalMethod: reading ? "automatic" : "manual",
                arrivalActorId: userId,
                arrivalNotification: {
                  state: "pending",
                  recipientUserId: customer?.userId,
                  attempts: 0,
                },
              },
              $inc: { arrivalVersion: 1 },
              $unset: { arrivalTracking: 1 },
            }
          : {
              $set: { arrivalTracking: tracking },
              $inc: { arrivalVersion: 1 },
            },
        { new: true, session, runValidators: true },
      );
      if (!updated)
        throw new ApiAuthError(
          "This job changed. Refresh its authoritative state.",
          409,
        );
      return { status: updated.status, state, transitioned: arrived };
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("Arrival transaction did not complete");
  let notificationPending = false;
  if (result.status === "arrived") {
    notificationPending = await deliverArrival(jobId).catch(() => true);
    if (result.transitioned) await emitArrivalStatus(jobId);
  }
  return { success: true, ...result, notificationPending };
}
