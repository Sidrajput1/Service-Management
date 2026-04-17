// models/Notification.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// export interface INotification extends Document {
//   toUserId?: mongoose.Types.ObjectId;
//   channel?: "whatsapp" | "sms" | "email" | "push" | "inapp";
//   title?: string;
//   message: string;
//   metadata?: Record<string, any>;
//   status?: "pending" | "sent" | "failed" | "delivered";
//   createdAt: Date;
//   updatedAt: Date;
// }

// const NotificationSchema = new Schema<INotification>(
//   {
//     toUserId: { type: Schema.Types.ObjectId, ref: "User" },
//     channel: { type: String },
//     title: String,
//     message: { type: String, required: true },
//     metadata: Schema.Types.Mixed,
//     status: { type: String, enum: ["pending", "sent", "failed", "delivered"], default: "pending" },
//   },
//   { timestamps: true }
// );

export type NotificationStatus = "unread" | "read";
export type NotificationChannel = "in_app" | "email" | "sms" | "whatsapp";

export interface INotification extends Document {
  recipientUserId?: mongoose.Types.ObjectId;
  recipientRole?: "admin" | "dispatcher" | "technician" | "customer";
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
  status: NotificationStatus;
  channel: NotificationChannel;
  entityType?: "lead" | "booking" | "job" | "invoice" | "payment" | "customer" | "technician";
  entityId?: mongoose.Types.ObjectId;
  actionUrl?: string;
  metadata?: Record<string, any>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    recipientRole: {
      type: String,
      enum: ["admin", "dispatcher", "technician", "customer"],
      index: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    type: {
      type: String,
      enum: ["lead", "booking", "job", "invoice", "payment", "profile", "system"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },

    channel: {
      type: String,
      enum: ["in_app", "email", "sms", "whatsapp"],
      default: "in_app",
    },

    entityType: {
      type: String,
      enum: ["lead", "booking", "job", "invoice", "payment", "customer", "technician"],
    },
    entityId: { type: Schema.Types.ObjectId },
    actionUrl: String,
    metadata: Schema.Types.Mixed,
    readAt: Date,
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientUserId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, status: 1, createdAt: -1 });


export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
export default Notification;