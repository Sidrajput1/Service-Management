import { requireCurrentUser, ApiAuthError } from "@/lib/auth";
import { notificationAudience } from "@/lib/access-policy.mjs";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult } from "@/lib/pagination";
import Notification from "@/models/notification";
import { z } from "zod";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { cursor, limit } = readPage(request);
    const audience = notificationAudience(user);
    const unreadOnly = new URL(request.url).searchParams.get("unreadOnly") === "true";
    const [rows, unreadCount] = await Promise.all([
      Notification.find({ ...audience, ...(unreadOnly ? { status: "unread" } : {}), ...(cursor ? { _id: { $lt: cursor } } : {}) }).sort({ _id: -1 }).limit(limit + 1).select("title message type status entityType entityId actionUrl createdAt readAt").lean(),
      Notification.countDocuments({ ...audience, status: "unread" }),
    ]);
    const page = pageResult(rows, limit);
    return privateJson({ notifications: page.items, unreadCount, nextCursor: page.nextCursor });
  } catch (error) { return apiFailure(error); }
}
const schema = z.object({ recipientUserId: z.string().regex(/^[a-f\d]{24}$/i).optional(), recipientRole: z.enum(["admin", "dispatcher"]).optional(), title: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(2000), type: z.enum(["lead", "booking", "job", "invoice", "payment", "profile", "system"]), actionUrl: z.string().max(300).optional() });
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    if (!["admin", "dispatcher"].includes(user.role)) throw new ApiAuthError("Forbidden", 403);
    const body = schema.parse(await request.json());
    if (!body.recipientUserId && !body.recipientRole) return privateJson({ error: "A recipient is required" }, 400);
    return privateJson({ notif: await Notification.create({ ...body, status: "unread", channel: "in_app" }) }, 201);
  } catch (error) { return apiFailure(error); }
}
