// models/Notification.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  toUserId?: mongoose.Types.ObjectId;
  channel?: "whatsapp" | "sms" | "email" | "push" | "inapp";
  title?: string;
  message: string;
  metadata?: Record<string, any>;
  status?: "pending" | "sent" | "failed" | "delivered";
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    toUserId: { type: Schema.Types.ObjectId, ref: "User" },
    channel: { type: String },
    title: String,
    message: { type: String, required: true },
    metadata: Schema.Types.Mixed,
    status: { type: String, enum: ["pending", "sent", "failed", "delivered"], default: "pending" },
  },
  { timestamps: true }
);

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
export default Notification;