import { isAxiosError } from "axios";
import type { ZodError } from "zod";
export function passwordFieldErrors(error: ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [
      String(issue.path[0] || "form"),
      issue.message,
    ]),
  );
}
export function passwordRequestFailure(error: unknown) {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string")
    return error.response.data.error as string;
  return "We could not complete this request. Please try again.";
}
