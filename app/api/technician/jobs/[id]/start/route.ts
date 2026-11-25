import { z } from "zod";
import { requireRole, ApiAuthError } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import { apiFailure, privateJson } from "@/lib/api-response";
import { withAssignedJob } from "@/lib/assigned-job-transaction";
import {
  jobOtpAttemptLimit,
  jobOtpState,
  matchesJobOtp,
} from "@/lib/job-start-otp";
import { assertProCanStart } from "@/lib/job-scheduling";
import Job from "@/models/job";
import {
  notifyCustomerOtpVerified,
  notifyJobOtpLocked,
} from "@/lib/notify-events";
import { getJobNotificationRecipients } from "@/lib/notification-recipents";

const StartSchema = z.object({ otp: z.string().min(1).max(32) });
const lockedMessage =
  "Verification is locked after five incorrect codes. Ask your service provider for a new verification code.";
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
    let challengeVersion: number | undefined;
    const outcome = await withAssignedJob(
      id,
      String(tech._id),
      async ({ job: assigned, session }) => {
        if (assigned.status !== "arrived")
          throw new ApiAuthError("You must reach the customer first", 400);
        const version = assigned.otpVersion ?? 0;
        challengeVersion ??= version;
        if (challengeVersion !== version)
          throw new ApiAuthError(
            "The verification code changed. Ask the customer for the current code.",
            409,
          );
        const now = new Date();
        const state = jobOtpState(assigned, now);
        if (state === "locked") return { state, newlyLocked: false } as const;
        if (state !== "ready")
          throw new ApiAuthError(
            "The verification code is no longer available. Ask your service provider for a new code.",
            409,
          );
        if (!matchesJobOtp(assigned.otp, parsed.otp)) {
          assigned.otpAttempts = (assigned.otpAttempts ?? 0) + 1;
          const newlyLocked = assigned.otpAttempts === jobOtpAttemptLimit;
          if (newlyLocked) assigned.otpLockedAt = now;
          await assigned.save({ session });
          if (newlyLocked)
            return {
              state: "locked",
              newlyLocked,
              jobId: String(assigned._id),
              version,
            } as const;
          return { state: "incorrect" } as const;
        }
        await assertProCanStart(
          tech._id,
          assigned._id as typeof tech._id,
          session,
        );
        const started = await Job.findOneAndUpdate(
          {
            _id: assigned._id,
            technicianId: tech._id,
            status: "arrived",
            customerOtpVerifiedAt: null,
            otpExpiresAt: { $gt: now },
          },
          {
            $set: {
              status: "in_progress",
              customerOtpVerifiedAt: now,
              startTime: assigned.startTime || now,
            },
            $unset: { arrivalTracking: 1, otp: 1, otpExpiresAt: 1 },
          },
          { returnDocument: "after", session },
        );
        if (!started)
          throw new ApiAuthError(
            "Job status changed. Refresh before starting.",
            409,
          );
        return { state: "started", job: started } as const;
      },
    );
    if (outcome.state === "incorrect")
      return privateJson(
        { error: "Invalid OTP. Check the code and try again." },
        400,
      );
    if (outcome.state === "locked") {
      if (outcome.newlyLocked) {
        try {
          const { providerUserId } = await getJobNotificationRecipients(
            outcome.jobId,
          );
          await notifyJobOtpLocked({
            jobId: outcome.jobId,
            version: outcome.version,
            providerUserId,
          });
        } catch {
          console.error(
            "Job verification locked. Notification delivery failed.",
          );
        }
      }
      return privateJson({ error: lockedMessage }, 429);
    }
    const { job } = outcome;
    try {
      const { customerUserId } = await getJobNotificationRecipients(
        String(job._id),
      );
      if (customerUserId)
        await notifyCustomerOtpVerified({
          customerUserId,
          jobId: String(job._id),
          bookingId: String(job.bookingId),
        });
    } catch {
      console.error("Job started. Verification notification delivery failed.");
    }
    return privateJson({ job });
  } catch (error) {
    return apiFailure(error);
  }
}
