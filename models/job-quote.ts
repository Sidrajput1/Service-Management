import mongoose, { Schema, type Types } from "mongoose";
import type { IInvoiceItem } from "./invoice";

export interface QuoteLine extends IInvoiceItem {
  chargeType: "service" | "part" | "labour" | "visit" | "other";
  taxable: boolean;
}

export interface QuotePricing {
  items: QuoteLine[];
  serviceBeforeDiscount: number;
  discountAmount: number;
  subtotal: number;
  taxableAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
}

const quoteLineSchema = new Schema<QuoteLine>(
  {
    itemType: { type: String, required: true },
    chargeType: { type: String, required: true },
    description: { type: String, required: true },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
    taxable: { type: Boolean, required: true },
  },
  { _id: false },
);

export const quotePricingSchema = new Schema<QuotePricing>(
  {
    items: { type: [quoteLineSchema], required: true },
    serviceBeforeDiscount: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    taxPercent: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
  },
  { _id: false },
);

export type QuoteStatus =
  | "pending_customer_approval"
  | "approved"
  | "rejected"
  | "superseded";

export interface JobQuoteData {
  _id: string;
  jobId: Types.ObjectId;
  version: number;
  status: QuoteStatus;
  pricing: QuotePricing;
  previousApprovedAmount: number | null;
  delta: number | null;
  reason?: string;
  createdBy: Types.ObjectId;
  submittedAt: Date;
  decidedBy?: Types.ObjectId;
  decidedAt?: Date;
  approvalSource?: "customer" | "within_approved_total";
  requestHash: string;
  partsDraftVersion: number;
}

export type QuoteView = Pick<
  JobQuoteData,
  | "version"
  | "status"
  | "pricing"
  | "previousApprovedAmount"
  | "delta"
  | "reason"
  | "approvalSource"
> & { decidedAt?: string };

const jobQuoteSchema = new Schema<JobQuoteData>({
  _id: { type: String, required: true },
  jobId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  version: { type: Number, required: true, immutable: true },
  status: {
    type: String,
    enum: ["pending_customer_approval", "approved", "rejected", "superseded"],
    required: true,
  },
  pricing: { type: quotePricingSchema, required: true, immutable: true },
  previousApprovedAmount: { type: Number, immutable: true },
  delta: { type: Number, immutable: true },
  reason: { type: String, immutable: true },
  createdBy: { type: Schema.Types.ObjectId, required: true, immutable: true },
  submittedAt: { type: Date, required: true, immutable: true },
  decidedBy: Schema.Types.ObjectId,
  decidedAt: Date,
  approvalSource: { type: String, enum: ["customer", "within_approved_total"] },
  requestHash: { type: String, required: true, immutable: true },
  partsDraftVersion: { type: Number, required: true, immutable: true },
});
jobQuoteSchema.index({ jobId: 1, version: 1 }, { unique: true });

const JobQuote =
  (mongoose.models.JobQuote as mongoose.Model<JobQuoteData> | undefined) ||
  mongoose.model<JobQuoteData>("JobQuote", jobQuoteSchema);
export default JobQuote;
