import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import mongoose from "mongoose";
import PasswordRateLimit from "@/models/PasswordRateLimit";
import { connectToDb } from "@/lib/db";
import {
  passwordIndexDefinitions,
  matchesPasswordIndex,
} from "@/lib/password-indexes.mjs";

export class PasswordError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const resetLifetimeMs = 30 * 60 * 1000;
export const newResetToken = () => randomBytes(32).toString("hex");
export const hashResetToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** No Host/header fallback: NEXTAUTH_URL is already the app's server origin configuration. */
export function passwordAppOrigin() {
  try {
    const url = new URL(process.env.NEXTAUTH_URL || "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
export async function readPasswordBody(request: Request) {
  const origin = passwordAppOrigin();
  if (!origin)
    throw new PasswordError(
      "Password management is temporarily unavailable.",
      503,
    );
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new PasswordError("Submit this request from Servizato.", 403);
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new PasswordError("Submit a JSON request.", 415);
  if (Number(request.headers.get("content-length")) > 8192)
    throw new PasswordError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PasswordError("Submit a valid request body.");
  const decoder = new TextDecoder();
  let size = 0,
    value = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 8192) {
        await reader.cancel();
        throw new PasswordError("Request is too large.", 413);
      }
      value += decoder.decode(next.value, { stream: true });
    }
    value += decoder.decode();
    return JSON.parse(value);
  } catch (error) {
    if (error instanceof PasswordError) throw error;
    throw new PasswordError("Submit a valid request body.");
  }
}
let readyUntil = 0;
export async function requirePasswordStorage() {
  await connectToDb();
  if (Date.now() < readyUntil) return;
  const db = mongoose.connection.db;
  if (!db)
    throw new PasswordError(
      "Password management is temporarily unavailable.",
      503,
    );
  try {
    const hello = await db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== "isdbgrid")
      throw new Error("Transactions required");
    for (const [name, keys, options] of passwordIndexDefinitions) {
      const indexes = await db.collection(name).listIndexes().toArray();
      if (!matchesPasswordIndex(indexes, keys, options))
        throw new Error("Indexes required");
    }
    readyUntil = Date.now() + 30_000;
  } catch {
    throw new PasswordError(
      "Password management is temporarily unavailable.",
      503,
    );
  }
}
export function passwordClientKey(request: Request) {
  // The VPS reverse proxy must overwrite X-Real-IP. Never trust forwarded headers by default.
  if (process.env.PASSWORD_TRUST_PROXY === "true") {
    const candidate = request.headers.get("x-real-ip") || "";
    if (isIP(candidate)) return candidate;
  }
  return "shared-untrusted-client";
}
export async function consumePasswordLimit(
  scope: string,
  identifier: string,
  max: number,
  windowMs: number,
  now = Date.now(),
) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret)
    throw new PasswordError(
      "Password management is temporarily unavailable.",
      503,
    );
  const bucket = Math.floor(now / windowMs);
  const id = createHmac("sha256", secret)
    .update(`${scope}:${identifier}:${bucket}`)
    .digest("hex");
  try {
    const result = await PasswordRateLimit.findOneAndUpdate(
      { _id: id, count: { $lt: max } },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 2) * windowMs) },
      },
      { upsert: true, new: true },
    ).lean();
    return Boolean(result);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return false;
    throw error;
  }
}
export async function enforcePasswordLimit(
  scope: string,
  identifier: string,
  max: number,
  windowMs: number,
) {
  if (!(await consumePasswordLimit(scope, identifier, max, windowMs)))
    throw new PasswordError(
      "Too many attempts. Please wait before trying again.",
      429,
    );
}
