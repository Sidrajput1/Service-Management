import { apiFailure, privateJson } from "@/lib/api-response";
import { ApiAuthError } from "@/lib/auth";
import { withAssignedJob } from "@/lib/assigned-job-transaction";
import { assertFinanceWrite } from "@/lib/finance-security";
import { jobOtpSelect, jobOtpState, newJobOtp } from "@/lib/job-start-otp";
import { objectIdSchema } from "@/lib/pagination";
import { requireProvider } from "@/lib/service-provider";
import Job from "@/models/job";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    const job = await Job.findOne({
      _id: id,
      serviceProviderId: provider._id,
    }).select(jobOtpSelect);
    if (!job) throw new ApiAuthError("Assigned job not found", 404);
    const state = jobOtpState(job);
    return privateJson({
      canIssue:
        job.status === "arrived" &&
        Boolean(job.technicianId) &&
        ["locked", "expired", "unavailable"].includes(state),
      locked: state === "locked",
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    assertFinanceWrite(request);
    const id = objectIdSchema.parse((await params).id);
    const owned = await Job.findOne({
      _id: id,
      serviceProviderId: provider._id,
    })
      .select("technicianId")
      .lean();
    if (!owned?.technicianId)
      throw new ApiAuthError("Assigned job not found", 404);
    await withAssignedJob(
      id,
      String(owned.technicianId),
      async ({ job, session }) => {
        if (String(job.serviceProviderId) !== String(provider._id))
          throw new ApiAuthError("Assigned job not found", 404);
        if (job.status !== "arrived" || job.customerOtpVerifiedAt)
          throw new ApiAuthError(
            "A new code can only be issued while the Pro is at the service address and work has not started.",
            409,
          );
        if (jobOtpState(job) === "ready")
          throw new ApiAuthError(
            "The customer already has a valid verification code.",
            409,
          );
        job.set({ ...newJobOtp(job.scheduledAt, job), otpLockedAt: undefined });
        await job.save({ session });
      },
    );
    return privateJson({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
