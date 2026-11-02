import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import PushSubscription from "@/models/PushSubscription";
import { connectToDb } from "./db";

export function newPushSessionId() {
  return randomBytes(32).toString("hex");
}
export function pushSessionHash(value: unknown): string | null {
  return typeof value === "string" && /^[a-f\d]{64}$/i.test(value)
    ? createHash("sha256")
        .update(`servizato-push-session:${value}`)
        .digest("hex")
    : null;
}
export async function readPushLogin(request: Request, userId: string) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const sessionHash = pushSessionHash(token?.pushSessionId);
  if (
    !token ||
    token.id !== userId ||
    !sessionHash ||
    !Number.isSafeInteger(token.exp) ||
    Number(token.exp) * 1000 <= Date.now()
  )
    return null;
  return { sessionHash, sessionExpiresAt: new Date(Number(token.exp) * 1000) };
}
/** No auth import: this module is intentionally safe for auth-options to import. */
export async function deactivatePushSession(token: unknown) {
  const value = token as { id?: unknown; pushSessionId?: unknown } | null;
  const hash = pushSessionHash(value?.pushSessionId);
  if (
    !hash ||
    typeof value?.id !== "string" ||
    !/^[a-f\d]{24}$/i.test(value.id)
  )
    return;
  const userId = value.id;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (async () => {
        await connectToDb();
        await PushSubscription.updateMany(
          { userId, sessionHash: hash, isActive: true },
          { $set: { isActive: false } },
        );
      })(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 1500);
      }),
    ]);
  } catch {
    // Logout must still complete. Worker resolution and browser unsubscribe fail closed independently.
    console.error(
      "Push logout cleanup is unavailable; no subscription details were logged.",
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
