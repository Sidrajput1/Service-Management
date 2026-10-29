import { notificationAudience } from "@/lib/access-policy.mjs";
import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import { z } from "zod";
import Notification from "@/models/notification";
export const runtime = "nodejs";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const id = objectIdSchema.parse((await params).id);
    z.object({ status: z.literal("read") }).parse(await request.json());
    const notif = await Notification.findOneAndUpdate({ _id: id, ...notificationAudience(user) }, { $set: { status: "read", readAt: new Date() } }, { new: true }).select("_id status readAt").lean();
    if (!notif) return privateJson({ error: "Notification not found" }, 404);
    return privateJson({ notif });
  } catch (error) { return apiFailure(error); }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const id = objectIdSchema.parse((await params).id);
    const removed = await Notification.findOneAndDelete({ _id: id, ...notificationAudience(user) });
    if (!removed) return privateJson({ error: "Notification not found" }, 404);
    return privateJson({ success: true });
  } catch (error) { return apiFailure(error); }
}