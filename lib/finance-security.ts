import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  createHmac,
} from "node:crypto";
import { ApiAuthError } from "./auth";
export function assertFinanceWrite(request: Request) {
  const origin = request.headers.get("origin"),
    site = request.headers.get("sec-fetch-site");
  if (
    origin !== new URL(request.url).origin ||
    (site && site !== "same-origin")
  )
    throw new ApiAuthError("Open this form in Servizato and try again.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiAuthError("Submit a JSON request.", 415);
}
function payoutKey() {
  const encoded = process.env.PAYOUT_ENCRYPTION_KEY || "";
  const key = Buffer.from(encoded, "base64");
  if (
    !/^[A-Za-z0-9+/]{43}=$/.test(encoded) ||
    key.length !== 32 ||
    key.toString("base64") !== encoded
  )
    throw new ApiAuthError(
      "Payout details are temporarily unavailable. Ask an admin to configure secure storage.",
      503,
    );
  return key;
}
export function payoutStorageReady() {
  try {
    payoutKey();
    return true;
  } catch {
    return false;
  }
}
export function payoutRequestFingerprint(value: unknown) {
  return createHmac("sha256", payoutKey())
    .update("payout-request:")
    .update(JSON.stringify(value))
    .digest("hex");
}
export function encryptPayout(value: Record<string, string>, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", payoutKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}
export function decryptPayout(
  value: string,
  context: string,
): Record<string, string> {
  const key = payoutKey();
  try {
    const [version, iv, tag, text, ...rest] = value.split(".");
    if (
      version !== "v1" ||
      rest.length ||
      Buffer.from(iv, "base64").length !== 12 ||
      Buffer.from(tag, "base64").length !== 16
    )
      throw new Error("Invalid envelope");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64"),
    );
    cipher.setAAD(Buffer.from(context));
    cipher.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        cipher.update(Buffer.from(text, "base64")),
        cipher.final(),
      ]).toString("utf8"),
    );
  } catch {
    throw new ApiAuthError(
      "Secure payout details could not be opened. Contact the administrator.",
      503,
    );
  }
}
export function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
