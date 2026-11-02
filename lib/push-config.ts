import "server-only";
import { createECDH, timingSafeEqual } from "node:crypto";

export interface PushConfiguration {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** Return nothing when configuration is absent/invalid; never log credential values. */
export function getPushConfiguration(): PushConfiguration | null {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || "";
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
    const subject = process.env.VAPID_SUBJECT?.trim() || "";
    if (
      !/^[A-Za-z0-9_-]{87}$/.test(publicKey) ||
      !/^[A-Za-z0-9_-]{43}$/.test(privateKey)
    )
      return null;
    const publicBytes = Buffer.from(publicKey, "base64url"),
      privateBytes = Buffer.from(privateKey, "base64url");
    if (
      publicBytes.length !== 65 ||
      publicBytes[0] !== 4 ||
      privateBytes.length !== 32 ||
      publicBytes.toString("base64url") !== publicKey ||
      privateBytes.toString("base64url") !== privateKey
    )
      return null;
    const curve = createECDH("prime256v1");
    curve.setPrivateKey(privateBytes);
    if (
      !timingSafeEqual(
        curve.getPublicKey(undefined, "uncompressed"),
        publicBytes,
      )
    )
      return null;
    if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(subject))
      return { publicKey, privateKey, subject };
    const contact = new URL(subject);
    if (
      contact.protocol !== "https:" ||
      !contact.hostname ||
      contact.username ||
      contact.password ||
      contact.hash
    )
      return null;
    return { publicKey, privateKey, subject };
  } catch {
    return null;
  }
}
