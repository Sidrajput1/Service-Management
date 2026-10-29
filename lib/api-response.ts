import { NextResponse } from "next/server";
import { ApiAuthError } from "@/lib/auth";
import { ZodError } from "zod";

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: privateHeaders });
}
export function apiFailure(error: unknown) {
  if (error instanceof SyntaxError)
    return privateJson({ error: "Submit a valid request body." }, 400);
  if (error instanceof ApiAuthError)
    return privateJson({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return privateJson(
      { error: "Check the submitted information.", issues: error.issues },
      400,
    );
  return privateJson(
    { error: "We couldn’t complete that request. Please try again." },
    500,
  );
}
