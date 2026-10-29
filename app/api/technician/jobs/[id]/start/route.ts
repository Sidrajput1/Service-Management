import { z } from "zod";
import { requireRole, ApiAuthError } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import { apiFailure, privateJson } from "@/lib/api-response";
import { withAssignedJob } from "@/lib/assigned-job-transaction";
import Job from "@/models/job";
import { notifyCustomerOtpVerified } from "@/lib/notify-events";
import { getJobNotificationRecipients } from "@/lib/notification-recipents";

const StartSchema = z.object({ otp: z.string().min(4, "OTP is required") });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();
    const parsed = StartSchema.parse(await request.json());
    const job = await withAssignedJob(
      id,
      String(tech._id),
      async ({ job: assigned, session }) => {
        if (assigned.status !== "arrived")
          throw new ApiAuthError("You must reach the customer first", 400);
        if (!assigned.otp || assigned.otp !== parsed.otp)
          throw new ApiAuthError("Invalid OTP", 400);
        const started = await Job.findOneAndUpdate(
          {
            _id: assigned._id,
            technicianId: tech._id,
            status: "arrived",
            otp: parsed.otp,
          },
          {
            $set: {
              status: "in_progress",
              customerOtpVerifiedAt: new Date(),
              startTime: assigned.startTime || new Date(),
            },
            $unset: { arrivalTracking: 1 },
          },
          { returnDocument: "after", session },
        );
        if (!started)
          throw new ApiAuthError(
            "Job status changed. Refresh before starting.",
            409,
          );
        return started;
      },
    );
    const recipients = await getJobNotificationRecipients(job._id.toString());
    await notifyCustomerOtpVerified({
      customerUserId: recipients.customerUserId!,
      jobId: job._id.toString(),
      bookingId: String(job.bookingId),
    });
    return privateJson({ job });
  } catch (error) {
    return apiFailure(error);
  }
}
