import mongoose, { Schema, Model } from "mongoose";

export interface IMessageAttachment {
  url: string;
  publicId?: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface IMessageReadBy {
  userId: mongoose.Types.ObjectId;
  role: "admin" | "dispatcher" | "technician" | "customer";
  readAt: Date;
}

export interface IMessage {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: "admin" | "dispatcher" | "technician" | "customer";
  text: string;
  attachments?: IMessageAttachment[];
  messageType: "text" | "system" | "file";
  readBy: IMessageReadBy[];
  metadata?: any;
}

const MessageAttachmentSchema = new Schema<IMessageAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    name: { type: String, default: null },
    mimeType: { type: String, default: null },
    size: { type: Number, default: null },
  },
  { _id: false }
);

const MessageReadBySchema = new Schema<IMessageReadBy>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: ["admin", "dispatcher", "technician", "customer"],
      required: true,
    },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderRole: {
      type: String,
      enum: ["admin", "dispatcher", "technician", "customer"],
      required: true,
      index: true,
    },
    text: { type: String, default: "" },
    attachments: { type: [MessageAttachmentSchema], default: [] },
    messageType: {
      type: String,
      enum: ["text", "system", "file"],
      default: "text",
    },
    readBy: { type: [MessageReadBySchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default Message;