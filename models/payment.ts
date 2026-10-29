// models/Payment.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentStatus = "created" | "success" | "failed" | "refunded";


export interface IPayment extends Document {
  invoiceId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  customerId?:mongoose.Types.ObjectId;
  amount: number;
  refundedPaise?: number;
  mode: "cash" | "upi" | "card" | "wallet" | "bank_transfer" | "other";
  gateway?: string; // e.g., razorpay
  gatewayTxnId?: string;
  status: PaymentStatus;
  paidAt?: Date;
  receivedBy?: mongoose.Types.ObjectId;
  note?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },

    amount: { type: Number, required: true },
    refundedPaise: { type: Number, min: 0, default: 0 },
    mode: {
      type: String,
      enum: ["cash", "upi", "card", "wallet", "bank_transfer","checkout", "other"],
      default: "upi",
    },
    gateway: String,
    gatewayTxnId: String,
    status: {
      type: String,
      enum: ["created", "success", "failed", "refunded"],
      default: "created",
    },
    paidAt: Date,
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true, autoIndex: false }
);

PaymentSchema.index({ gateway: 1, gatewayTxnId: 1 }, { unique: true, partialFilterExpression: { gatewayTxnId: { $type: "string" }, gateway: { $type: "string" } } });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
export default Payment;
