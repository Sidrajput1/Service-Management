import { after } from "next/server";
import { privateJson } from "@/lib/api-response";
import {
  forgotPasswordInput,
  genericResetResponse,
} from "@/lib/password-policy";
import { getEmailConfiguration } from "@/lib/email/resend";
import {
  enforcePasswordLimit,
  PasswordError,
  passwordClientKey,
  readPasswordBody,
  requirePasswordStorage,
} from "@/lib/password-security";
import { issuePasswordReset } from "@/lib/password-management";
import { passwordFailure } from "@/lib/password-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const value = forgotPasswordInput.parse(await readPasswordBody(request));
    if (!getEmailConfiguration())
      throw new PasswordError(
        "Password recovery is temporarily unavailable. Please try again later or use another sign-in method.",
        503,
      );
    await requirePasswordStorage();
    await enforcePasswordLimit(
      "forgot-client",
      passwordClientKey(request),
      100,
      15 * 60_000,
    );
    await enforcePasswordLimit("forgot-email", value.email, 5, 60 * 60_000);
    await enforcePasswordLimit("forgot-cooldown", value.email, 1, 60_000);
    after(() => issuePasswordReset(value.email));
    return privateJson({ message: genericResetResponse });
  } catch (error) {
    return passwordFailure(error);
  }
}
