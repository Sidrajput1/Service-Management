import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IPushSubscription {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  deviceLabel: string;
  isActive: boolean;
  bindingToken: string;
  sessionHash: string;
  sessionExpiresAt: Date;
  credentialVersion: number;
  activatedAt: Date;
  expirationTime?: Date | null;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export { pushIndexDefinitions } from "@/lib/push-indexes.mjs";

const schema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, maxlength: 2048, select: false },
    keys: {
      type: new Schema(
        {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
      select: false,
    },
    deviceLabel: { type: String, required: true, maxlength: 80 },
    isActive: { type: Boolean, required: true, default: true },
    bindingToken: { type: String, required: true, select: false },
    sessionHash: { type: String, required: true, select: false },
    sessionExpiresAt: { type: Date, required: true, select: false },
    credentialVersion: { type: Number, required: true, default: 0 },
    activatedAt: { type: Date, required: true, select: false },
    expirationTime: { type: Date, default: null, select: false },
    lastSeenAt: { type: Date, required: true },
  },
  { timestamps: true, autoCreate: false, autoIndex: false },
);
schema.index({ endpoint: 1 }, { unique: true });
schema.index({ userId: 1, isActive: 1 });
schema.set("toJSON", {
  transform(_doc, result) {
    for (const key of [
      "endpoint",
      "keys",
      "sessionHash",
      "bindingToken",
      "sessionExpiresAt",
      "expirationTime",
      "credentialVersion",
      "activatedAt",
    ])
      Reflect.deleteProperty(result, key);
    return result;
  },
});

const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>("PushSubscription", schema);
export default PushSubscription;
