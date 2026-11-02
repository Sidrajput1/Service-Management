import { requireRole, ApiAuthError } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import { apiFailure, privateJson } from "@/lib/api-response";
import { withAssignedJob } from "@/lib/assigned-job-transaction";
import Job from "@/models/job";
import Technician from "@/models/technician";
import {
  notifyTechnicianAcceptedJob,
  notifyTechnicianEnroute,
} from "@/lib/notify-events";
import { getJobNotificationRecipients } from "@/lib/notification-recipents";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();
    const populatedPro = await tech.populate<{ userId: { name?: string } }>(
      "userId",
      "name",
    );
    const job = await withAssignedJob(
      id,
      String(tech._id),
      async ({ job: assigned, session }) => {
        if (!["assigned", "scheduled"].includes(assigned.status))
          throw new ApiAuthError(
            "Job cannot be accepted in current status",
            400,
          );
        const accepted = await Job.findOneAndUpdate(
          {
            _id: assigned._id,
            technicianId: tech._id,
            status: { $in: ["assigned", "scheduled"] },
          },
          {
            $set: { status: "enroute", acceptedAt: new Date() },
            $inc: { arrivalVersion: 1 },
            $unset: { arrivalTracking: 1 },
          },
          { returnDocument: "after", session },
        );
        if (!accepted)
          throw new ApiAuthError(
            "Assignment or job status changed. Refresh before accepting.",
            409,
          );
        await Technician.updateOne(
          { _id: tech._id },
          { $set: { status: "busy" } },
          { session },
        );
        return accepted;
      },
    );
    const recipients = await getJobNotificationRecipients(job._id.toString());
    await notifyTechnicianAcceptedJob({
      customerUserId: recipients.customerUserId || undefined,
      providerUserId: recipients.providerUserId || undefined,
      jobId: job._id.toString(),
      bookingId: String(job.bookingId),
    });
    await notifyTechnicianEnroute({
      notificationKey: `${job._id}:${job.acceptedAt?.toISOString() || "legacy"}`,
      customerUserId: recipients.customerUserId!,
      jobId: job._id.toString(),
      bookingId: String(job.bookingId),
      technicianName: populatedPro.userId?.name ?? "Pro",
    });
    return privateJson({ job });
  } catch (error) {
    return apiFailure(error);
  }
}
