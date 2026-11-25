import "server-only";
import { after } from "next/server";
import { ZodError } from "zod";
import { ApiAuthError } from "@/lib/auth";
import { privateJson } from "@/lib/api-response";
import { PasswordError } from "@/lib/password-security";
import {
  changeAccountPassword,
  notifyPasswordChanged,
  resetAccountPassword,
} from "@/lib/password-management";
export function passwordFailure(error: unknown) {
  if (error instanceof PasswordError || error instanceof ApiAuthError)
    return privateJson({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return privateJson(
      {
        error: "Check the password information.",
        issues: error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      400,
    );
  return privateJson(
    {
      error:
        "Password management is temporarily unavailable. Please try again later.",
    },
    503,
  );
}
export async function passwordMutationResponse(
  request: Request,
  options?: { providerOnly?: boolean; initialOnly?: boolean },
) {
  try {
    const notice = options
      ? await changeAccountPassword(request, options)
      : await resetAccountPassword(request);
    try {
      after(() => notifyPasswordChanged(notice));
    } catch {
      // Confirmation delivery must never turn a committed password update into an error response.
      console.warn("Password change confirmation could not be scheduled.");
    }
    return privateJson({
      success: true,
      signInRequired: true,
      message: "Password updated. Sign in again on all devices.",
    });
  } catch (error) {
    return passwordFailure(error);
  }
}
