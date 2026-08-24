import Notification from "@/models/notification";
import { connectToDb } from "./db";
import User from "@/models/user";

type CreateNotificationInput = {
  recipientUserId?: string;
  recipientRole?: "admin" | "dispatcher" | "technician" | "customer" | "service_provider";
  title: string;
  message: string;
  type: "lead" | "booking" | "job" | "invoice" | "payment" | "profile" | "system";
  entityType?: "lead" | "booking" | "job" | "invoice" | "payment" | "customer" | "technician";
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  channel?: "in_app" | "email" | "sms" | "whatsapp";
};

export async function createNotification(input:CreateNotificationInput){
    await connectToDb();

    return Notification.create({
        recipientUserId:input.recipientUserId,
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
    })
};

export async function createNotificationForRole(
    role:"admin" | "dispatcher" | "technician" | "customer" | "service_provider",
    input:Omit<CreateNotificationInput, "recipientRole" | "recipientUserId">
){
    await connectToDb();

    const users = await User.find({role}).select("_id").lean();

    if(!users.length) return [];

    return Notification.insertMany(
        users.map((u) => ({
            recipientUserId: u._id,
      recipientRole: role,
      title: input.title,
      message: input.message,
      type: input.type,
      status: "unread",
      channel: input.channel || "in_app",
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
      metadata: input.metadata || {},
        }))
    )

}