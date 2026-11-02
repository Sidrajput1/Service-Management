import "server-only";
import { ECDH, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiAuthError } from "./auth";

/** Do not turn the application server into a client-directed arbitrary HTTPS POST proxy. */
export function validPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (
      value.length > 2048 ||
      /[\s\\\u0000-\u001f\u007f]/u.test(value) ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      (url.port && url.port !== "443")
    )
      return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "fcm.googleapis.com" ||
      host === "web.push.apple.com" ||
      host === "updates.push.services.mozilla.com" ||
      /^[a-z0-9-]+\.push\.services\.mozilla\.com$/.test(host) ||
      /^[a-z0-9-]+\.notify\.windows\.com$/.test(host)
    );
  } catch {
    return false;
  }
}
export function validPushKey(value: string, bytes: number) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== bytes || decoded.toString("base64url") !== value)
    return false;
  if (bytes === 65) {
    try {
      return (
        decoded[0] === 4 &&
        Buffer.from(ECDH.convertKey(decoded, "prime256v1")).equals(decoded)
      );
    } catch {
      return false;
    }
  }
  return true;
}
export function equalPushSecret(first: string, second: string) {
  const a = Buffer.from(first),
    b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const pushEndpointSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(validPushEndpoint, "Use a supported browser push endpoint.");
export const registerPushSchema = z
  .object({
    subscription: z
      .object({
        endpoint: pushEndpointSchema,
        expirationTime: z
          .number()
          .int()
          .positive()
          .max(8_640_000_000_000_000)
          .nullable()
          .optional(),
        keys: z
          .object({
            p256dh: z
              .string()
              .length(87)
              .refine(
                (value) => validPushKey(value, 65),
                "Invalid browser subscription key.",
              ),
            auth: z
              .string()
              .min(20)
              .max(24)
              .refine(
                (value) => validPushKey(value, 16),
                "Invalid browser authentication key.",
              ),
          })
          .strict(),
      })
      .strict(),
    deviceLabel: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[^\u0000-\u001f\u007f]+$/u)
      .optional(),
  })
  .strict();
export const currentPushSchema = z
  .object({ endpoint: pushEndpointSchema })
  .strict();
export const resolvePushSchema = z
  .object({
    notificationId: z.string().regex(/^[a-f\d]{24}$/i),
    subscriptionId: z.string().regex(/^[a-f\d]{24}$/i),
    bindingToken: z.string().regex(/^[a-f\d]{64}$/i),
  })
  .strict();

export function assertPushWrite(request: Request) {
  const origin = new URL(request.url).origin;
  if (
    request.headers.get("origin") !== origin ||
    (request.headers.get("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")
  )
    throw new ApiAuthError(
      "Open notification settings in Servizato and try again.",
      403,
    );
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new ApiAuthError("Submit a JSON request.", 415);
}
export async function readPushJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 4096,
  allowEmpty = false,
): Promise<T> {
  const length = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(length) || length < 0 || length > maxBytes)
    throw new ApiAuthError(
      "The notification settings request is too large.",
      413,
    );
  const reader = request.body?.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  if (reader)
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiAuthError(
          "The notification settings request is too large.",
          413,
        );
      }
      chunks.push(next.value);
    }
  const text = Buffer.concat(chunks).toString("utf8");
  return schema.parse(
    text ? JSON.parse(text) : allowEmpty ? {} : JSON.parse(text),
  );
}

type RateEntry = { expiresAt: number; count: number };
const processState = globalThis as typeof globalThis & {
  servizatoPushRates?: Map<string, RateEntry>;
};
const rates = (processState.servizatoPushRates ||= new Map());
/** Deliberately bounded, per-process abuse protection, matching the current deployment style. */
export function limitPushRequests(
  userId: string,
  operation: "read" | "write" | "resolve",
  now = Date.now(),
) {
  for (const [key, entry] of rates)
    if (entry.expiresAt <= now) rates.delete(key);
  const key = `${operation}:${userId}`,
    limit = operation === "write" ? 30 : 120;
  const entry = rates.get(key);
  if (!entry) {
    if (rates.size >= 5000)
      throw new ApiAuthError(
        "Notification settings are busy. Try again shortly.",
        429,
      );
    rates.set(key, { expiresAt: now + 60_000, count: 1 });
  } else if (++entry.count > limit)
    throw new ApiAuthError(
      "Too many notification settings requests. Try again shortly.",
      429,
    );
}
