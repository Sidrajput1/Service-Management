import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { apiFailure, privateJson } from "@/lib/api-response";
import { ApiAuthError } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import { prepareWeeklyReminders } from "@/lib/finance-collections";
import { prepareOlderInvoices } from "@/lib/finance-maintenance";
import { objectIdSchema } from "@/lib/pagination";
export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("weekly_reminders") }).strict(),
  z
    .object({
      action: z.literal("prepare_invoices"),
      after: objectIdSchema.optional(),
      limit: z.number().int().min(1).max(100).default(50),
    })
    .strict(),
]);
export async function POST(request: Request) {
  try {
    const expected = process.env.FINANCE_COLLECTION_JOB_TOKEN || "",
      received =
        request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    if (!/^[a-f\d]{64}$/i.test(expected))
      throw new ApiAuthError("Finance maintenance is not configured.", 503);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
    )
      throw new ApiAuthError("Unauthorized", 401);
    const input = schema.parse(await request.json());
    await connectToDb();
    return privateJson(
      input.action === "weekly_reminders"
        ? await prepareWeeklyReminders()
        : await prepareOlderInvoices(input.after, input.limit),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
