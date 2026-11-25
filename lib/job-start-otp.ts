import { timingSafeEqual } from "node:crypto";
import type { IJob } from "@/models/job";
import { generateSixDigitOtp } from "./otp";

export const jobOtpSelect =
  "+otp +otpExpiresAt +otpVersion +otpAttempts +otpLockedAt";
export const jobOtpAttemptLimit = 5;
const sixDigits = /^\d{6}$/;

function jobOtpLocked(job: Pick<IJob, "otpLockedAt" | "otpAttempts">) {
  return (
    Boolean(job.otpLockedAt) || (job.otpAttempts ?? 0) >= jobOtpAttemptLimit
  );
}

type Challenge = Pick<
  IJob,
  | "otp"
  | "otpVersion"
  | "otpAttempts"
  | "otpLockedAt"
  | "otpExpiresAt"
  | "customerOtpVerifiedAt"
>;

export function jobOtpState(job: Challenge, now = new Date()) {
  if (job.customerOtpVerifiedAt) return "used";
  if (jobOtpLocked(job)) return "locked";
  if (!job.otp || !sixDigits.test(job.otp)) return "unavailable";
  if (!(Number(job.otpExpiresAt) > now.getTime())) return "expired";
  return "ready";
}

export function matchesJobOtp(otp: string | undefined, submitted: string) {
  return Boolean(
    otp &&
      sixDigits.test(otp) &&
      sixDigits.test(submitted) &&
      timingSafeEqual(Buffer.from(otp), Buffer.from(submitted)),
  );
}

export function newJobOtp(
  scheduledAt?: Date,
  previous: Pick<Challenge, "otp" | "otpVersion"> = {},
  now = new Date(),
) {
  let otp: string;
  do {
    otp = generateSixDigitOtp();
  } while (otp === previous.otp);
  const otpExpiresAt = new Date(
    Math.max(now.getTime(), scheduledAt?.getTime() || 0),
  );
  otpExpiresAt.setHours(23, 59, 59, 999);
  return {
    otp,
    otpExpiresAt,
    otpVersion: (previous.otpVersion ?? 0) + 1,
    otpAttempts: 0,
  };
}
