import Notification from "@/models/notification";
import { connectToDb } from "./db";
import User from "@/models/user";
import { scheduleNotificationPush } from "./push-delivery";
import type { PushEvent } from "./push-policy.mjs";

type CreateNotificationInput = {
  recipientUserId?: string;
  recipientRole?:
    | "admin"
    | "dispatcher"
    | "technician"
    | "customer"
    | "service_provider";
  title: string;
  message: string;
  type:
    | "lead"
    | "booking"
    | "job"
    | "invoice"
    | "payment"
    | "profile"
    | "system";
  entityType?:
    | "lead"
    | "booking"
    | "job"
    | "invoice"
    | "payment"
    | "customer"
    | "technician"
    | "service_provider"
    | "service_offering";
  entityId?: string;
  actionUrl?: string;
  dedupeKey?: string;
  pushEvent?: PushEvent;
  metadata?: Record<string, any>;
  channel?: "in_app" | "email" | "sms" | "whatsapp";
};

export async function createNotification(input: CreateNotificationInput) {
  await connectToDb();

  const fields = {
    recipientUserId: input.recipientUserId,
    recipientRole: input.recipientRole,
    title: input.title,
    message: input.message,
    type: input.type,
    status: "unread",
    channel: input.channel || "in_app",
    entityType: input.entityType,
    entityId: input.entityId,
    actionUrl: input.actionUrl,
    metadata: input.metadata || {},
    pushEvent: input.pushEvent,
  };
  const notification = input.dedupeKey
    ? await Notification.findOneAndUpdate(
        { dedupeKey: input.dedupeKey },
        { $setOnInsert: { ...fields, dedupeKey: input.dedupeKey } },
        { upsert: true, new: true },
      )
    : await Notification.create(fields);
  if (input.pushEvent && notification?._id) {
    try {
      scheduleNotificationPush(String(notification._id));
    } catch {
      /* Optional delivery cannot change the saved in-app result. */
    }
  }
  return notification;
}

export async function createNotificationForRole(
  role: "admin" | "dispatcher" | "technician" | "customer" | "service_provider",
  input: Omit<CreateNotificationInput, "recipientRole" | "recipientUserId">,
) {
  await connectToDb();

  const users = await User.find({ role }).select("_id").lean();

  if (!users.length) return [];

  return Promise.all(users.map(user => createNotification({
    ...input,
    recipientUserId: String(user._id),
    recipientRole: role,
    dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${user._id}` : undefined,
  })));
}
