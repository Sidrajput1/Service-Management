import "server-only";
import { Resend } from "resend";
import { z } from "zod";

export function getEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  //console.log("RESEND_API_KEY", apiKey);
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  console.log("[Email Config Check]", {
    hasApiKey: Boolean(apiKey),
    hasEmailFrom: Boolean(from),
    hasReplyTo: Boolean(replyTo),
    debugEnabled: process.env.RESEND_DEBUG === "true",
    apiKeyHasWhitespace: Boolean(apiKey && /\s/.test(apiKey)),
  });

  // The SDK's debug mode can log raw provider errors; never use it for recovery messages.
  if (
    process.env.RESEND_DEBUG === "true" ||
    !apiKey ||
    /\s/.test(apiKey) ||
    !from ||
    /[\r\n]/.test(from) ||
    from.length > 320
  )
    return null;
  const match = from.match(/^(?:[^<>\r\n]+\s<([^<>\s]+)>|([^<>\s]+))$/);
  const address = match?.[1] || match?.[2];
  if (
    !address ||
    !z.email().safeParse(address).success ||
    (replyTo && !z.email().safeParse(replyTo).success)
  )
    return null;
  // Syntax is not domain verification. Resend must accept the configured sender.
  return { apiKey, from, replyTo: replyTo || undefined };
}
export async function sendTransactionalEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  const config = getEmailConfiguration();
  if (!config) return false;
  try {
    const client = new Resend(config.apiKey, {
      baseUrl: "https://api.resend.com",
    });
    const { data, error } = await client.emails.send(
      {
        from: config.from,
        to: [message.to],
        replyTo: config.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      {
        idempotencyKey: message.idempotencyKey,
        signal: AbortSignal.timeout(10_000),
      },
    );
    return !error && Boolean(data?.id); // API acceptance, never a claim of inbox delivery.
  } catch {
    return false;
  }
}
