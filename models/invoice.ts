// models/Invoice.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoice extends Document {
  jobId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId?: mongoose.Types.ObjectId;
  lineItems: { description: string; qty: number; unitPrice: number; amount: number }[];
  subTotal: number;
  tax: number;
  total: number;
  taxBreakdown?: Record<string, any>;
  status: "pending" | "paid" | "partial" | "refunded" | "cancelled";
  issuedAt?: Date;
  paidAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    invoiceNumber: { type: String, required: true, index: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    lineItems: [{ description: String, qty: Number, unitPrice: Number, amount: Number }],
    subTotal: Number,
    tax: Number,
    total: Number,
    taxBreakdown: Schema.Types.Mixed,
    status: { type: String, enum: ["pending", "paid", "partial", "refunded", "cancelled"], default: "pending" },
    issuedAt: Date,
    paidAt: Date,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;