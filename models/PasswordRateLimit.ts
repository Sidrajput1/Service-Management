import mongoose, { Schema, type Model } from "mongoose";
export interface PasswordRateRecord {
  _id: string;
  count: number;
  expiresAt: Date;
}
const schema = new Schema<PasswordRateRecord>(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    autoCreate: false,
    autoIndex: false,
    collection: "passwordratelimits",
    versionKey: false,
  },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const PasswordRateLimit: Model<PasswordRateRecord> =
  mongoose.models.PasswordRateLimit ||
  mongoose.model<PasswordRateRecord>("PasswordRateLimit", schema);
export default PasswordRateLimit;
