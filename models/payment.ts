// models/Payment.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  invoiceId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  amount: number;
  mode: "cash" | "upi" | "card" | "wallet" | "transfer" | "other";
  gateway?: string; // e.g., razorpay
  gatewayTxnId?: string;
  status: "created" | "success" | "failed" | "refunded";
  paymentDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ["cash", "upi", "card", "wallet", "transfer", "other"], default: "upi" },
    gateway: String,
    gatewayTxnId: String,
    status: { type: String, enum: ["created", "success", "failed", "refunded"], default: "created" },
    paymentDate: Date,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
export default Payment;