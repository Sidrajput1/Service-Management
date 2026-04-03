import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWebhookEvent extends Document {
  provider: "razorpay";
  eventId: string;
  eventName: string;
  processedAt: Date;
  payload: Record<string, any>;
  status: "processed" | "ignored" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, default: "razorpay" },
    eventId: { type: String, required: true, unique: true, index: true },
    eventName: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["processed", "ignored", "failed"],
      default: "processed",
    },
  },
  { timestamps: true }
);

export const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);

export default WebhookEvent;