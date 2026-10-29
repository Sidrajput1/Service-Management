import Job from "@/models/job";
import { notifyTechnicianArrived } from "./notify-events";
import { getIO } from "./socket";
export async function deliverArrival(jobId: string) {
  const job = await Job.findById(jobId)
    .select("bookingId arrivedAt +arrivalNotification")
    .lean();
  if (!job?.arrivedAt || job.arrivalNotification?.state !== "pending")
    return false;
  try {
    if (job.arrivalNotification.recipientUserId)
      await notifyTechnicianArrived({
        jobId,
        bookingId: String(job.bookingId),
        customerUserId: String(job.arrivalNotification.recipientUserId),
        dedupeKey: `job-arrival:${jobId}`,
      });
    await Job.updateOne(
      { _id: jobId, "arrivalNotification.state": "pending" },
      {
        $set: {
          "arrivalNotification.state": "sent",
          "arrivalNotification.sentAt": new Date(),
        },
        $inc: { "arrivalNotification.attempts": 1 },
      },
    );
    return false;
  } catch {
    await Job.updateOne(
      { _id: jobId },
      { $inc: { "arrivalNotification.attempts": 1 } },
    ).catch(() => undefined);
    return true;
  }
}
export async function emitArrivalStatus(jobId: string) {
  try {
    await getIO()?.emitAuthorizedJobStatus?.(jobId);
  } catch {
    /* HTTP polling remains authoritative. */
  }
}
