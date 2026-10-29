import mongoose, { Schema, type Model, type Types } from "mongoose";
export interface IModerationAudit {
  _id: Types.ObjectId;
  actorKey: string;
  actorId?: Types.ObjectId;
  actorKind: "admin" | "service_provider" | "operator";
  requestId: string;
  requestHash: string;
  targetType: "provider" | "offering" | "catalog" | "admin_account";
  targetId: Types.ObjectId;
  action: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  notificationRecipientId?: Types.ObjectId;
  notificationState: "none" | "pending" | "sent";
  notificationAttempts: number;
  notifiedAt?: Date;
  createdAt: Date;
}
const schema = new Schema<IModerationAudit>(
  {
    actorKey: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorKind: {
      type: String,
      enum: ["admin", "service_provider", "operator"],
      required: true,
    },
    requestId: { type: String, required: true },
    requestHash: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["provider", "offering", "catalog", "admin_account"],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    reason: { type: String, default: "", maxlength: 1000 },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    notificationRecipientId: { type: Schema.Types.ObjectId, ref: "User" },
    notificationState: {
      type: String,
      enum: ["none", "pending", "sent"],
      default: "none",
    },
    notificationAttempts: { type: Number, default: 0 },
    notifiedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ actorKey: 1, requestId: 1 }, { unique: true });
schema.index({ targetType: 1, targetId: 1, createdAt: -1 });
schema.index({ notificationState: 1, _id: 1 });
const ModerationAudit: Model<IModerationAudit> =
  mongoose.models.ModerationAudit ||
  mongoose.model<IModerationAudit>("ModerationAudit", schema);
export default ModerationAudit;
