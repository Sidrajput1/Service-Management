// models/Otp.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOtp extends Document {
  phone_number: string;
  code: string;
  expiresAt: Date;
  used?: boolean;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    phone_number: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OtpSchema.index({ phone: 1, createdAt: -1 });

export const Otp: Model<IOtp> = mongoose.models.Otp || mongoose.model<IOtp>("Otp", OtpSchema);
export default Otp;