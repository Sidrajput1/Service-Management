import { notificationAudience } from "@/lib/access-policy.mjs";
import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import Notification from "@/models/notification";
export const runtime = "nodejs";
export async function POST() {
  try {
    const user = await requireCurrentUser();
    await Notification.updateMany({ ...notificationAudience(user), status: "unread" }, { $set: { status: "read", readAt: new Date() } });
    return privateJson({ success: true });
  } catch (error) { return apiFailure(error); }
}