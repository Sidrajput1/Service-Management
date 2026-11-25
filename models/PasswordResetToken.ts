import mongoose, { Schema, type Model, type Types } from "mongoose";
export interface PasswordResetRecord {
  userId: Types.ObjectId;
  tokenHash: string;
  credentialVersion: number;
  emailHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
const schema = new Schema<PasswordResetRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, select: false },
    credentialVersion: { type: Number, required: true },
    emailHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true },
  },
  { autoCreate: false, autoIndex: false, collection: "passwordresettokens" },
);
schema.index({ tokenHash: 1 }, { unique: true });
schema.index({ userId: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.set("toJSON", {
  transform(_document, result) {
    Reflect.deleteProperty(result, "tokenHash");
    Reflect.deleteProperty(result, "emailHash");
    return result;
  },
});
const PasswordResetToken: Model<PasswordResetRecord> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<PasswordResetRecord>("PasswordResetToken", schema);
export default PasswordResetToken;
