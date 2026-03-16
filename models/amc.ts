// models/AMC.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAMC extends Document {
  customerId: mongoose.Types.ObjectId;
  planName: string;
  price: number;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  visitsAllowed?: number;
  visitsUsed?: number;
  status: "active" | "expired" | "cancelled";
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AMCSchema = new Schema<IAMC>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    planName: String,
    price: Number,
    startDate: Date,
    endDate: Date,
    renewalDate: Date,
    visitsAllowed: Number,
    visitsUsed: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const AMC: Model<IAMC> = mongoose.models.AMC || mongoose.model<IAMC>("AMC", AMCSchema);
export default AMC;