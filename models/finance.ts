import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  commissionSnapshotSchema,
  type CommissionSnapshot,
} from "./finance-fields";
const oid = Schema.Types.ObjectId;
const amount = {
  type: Number,
  min: 0,
  default: 0,
  validate: Number.isSafeInteger,
};
export interface CommissionPolicyData {
  _id: Types.ObjectId;
  scope: "global" | "category" | "provider";
  scopeKey: string;
  rateBps: number;
  basis: "invoice_before_tax";
  effectiveAt: Date;
  collectionDays: number;
  termsVersion: string;
  createdBy: Types.ObjectId;
  reason: string;
  createdAt: Date;
}
const policySchema = new Schema<CommissionPolicyData>(
  {
    scope: {
      type: String,
      enum: ["global", "category", "provider"],
      required: true,
    },
    scopeKey: { type: String, required: true },
    rateBps: {
      type: Number,
      min: 0,
      max: 10000,
      required: true,
      validate: Number.isInteger,
    },
    basis: { type: String, enum: ["invoice_before_tax"], required: true },
    effectiveAt: { type: Date, required: true },
    collectionDays: { type: Number, min: 1, max: 90, required: true },
    termsVersion: { type: String, required: true },
    createdBy: { type: oid, ref: "User", required: true },
    reason: { type: String, required: true, maxLength: 500 },
  },
  {
    autoIndex: false,
    autoCreate: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);
policySchema.index({ scope: 1, scopeKey: 1, effectiveAt: 1 }, { unique: true });
export const CommissionPolicy: Model<CommissionPolicyData> =
  mongoose.models.CommissionPolicy ||
  mongoose.model("CommissionPolicy", policySchema);
export interface TermsAcceptanceData {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  policyId: Types.ObjectId;
  termsVersion: string;
  acceptedBy: Types.ObjectId;
  acceptedAt: Date;
}
const termsSchema = new Schema<TermsAcceptanceData>({
  providerId: { type: oid, ref: "ServiceProvider", required: true },
  policyId: { type: oid, ref: "CommissionPolicy", required: true },
  termsVersion: { type: String, required: true },
  acceptedBy: { type: oid, ref: "User", required: true },
  acceptedAt: { type: Date, required: true },
});
termsSchema.index({ providerId: 1, policyId: 1 }, { unique: true });
termsSchema.set("autoIndex", false);
termsSchema.set("autoCreate", false);
export const FinanceTermsAcceptance: Model<TermsAcceptanceData> =
  mongoose.models.FinanceTermsAcceptance ||
  mongoose.model("FinanceTermsAcceptance", termsSchema);
export interface FinanceLedgerData {
  _id: Types.ObjectId;
  invoiceId: Types.ObjectId;
  invoiceNumber: string;
  bookingId: Types.ObjectId;
  jobId: Types.ObjectId;
  customerId: Types.ObjectId;
  providerId: Types.ObjectId;
  technicianId?: Types.ObjectId;
  categoryKey?: string;
  snapshot: CommissionSnapshot;
  policyState: string;
  grossPaise: number;
  eligiblePaise: number;
  commissionPaise?: number;
  commissionAdjustmentPaise: number;
  payoutAdjustmentPaise: number;
  invoiceVersion: number;
  jobCompleted: boolean;
  billState:
    | "not_submitted"
    | "pending"
    | "confirmed"
    | "disputed"
    | "reviewed";
  paymentMode?: "cash" | "direct_upi" | "servizato_online";
  claimedCollectedPaise: number;
  paymentState:
    | "unpaid"
    | "claimed"
    | "paid"
    | "refunded"
    | "review"
    | "not_required";
  submittedBy?: Types.ObjectId;
  submittedAt?: Date;
  confirmedBy?: Types.ObjectId;
  confirmedAt?: Date;
  disputeReason?: string;
  reviewReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  onlineReceivedPaise: number;
  unallocatedReceivedPaise: number;
  unallocatedRefundedPaise: number;
  refundedPaise: number;
  collectedPaise: number;
  payoutPaidPaise: number;
  dueAt?: Date;
  collectionId?: Types.ObjectId;
  collectionReservedPaise: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
const ledgerSchema = new Schema<FinanceLedgerData>(
  {
    invoiceId: { type: oid, ref: "Invoice", required: true, unique: true },
    invoiceNumber: { type: String, required: true },
    bookingId: { type: oid, ref: "Booking", required: true },
    jobId: { type: oid, ref: "Job", required: true },
    customerId: { type: oid, ref: "Customer", required: true },
    providerId: {
      type: oid,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },
    technicianId: { type: oid, ref: "Technician" },
    categoryKey: String,
    snapshot: { type: commissionSnapshotSchema, required: true },
    policyState: {
      type: String,
      enum: ["ready", "missing_policy", "terms_pending", "legacy_review"],
      required: true,
    },
    grossPaise: amount,
    eligiblePaise: amount,
    commissionPaise: { type: Number, min: 0, validate: Number.isSafeInteger },
    commissionAdjustmentPaise: {
      type: Number,
      default: 0,
      validate: Number.isSafeInteger,
    },
    payoutAdjustmentPaise: {
      type: Number,
      default: 0,
      validate: Number.isSafeInteger,
    },
    invoiceVersion: { type: Number, default: 1 },
    jobCompleted: { type: Boolean, required: true },
    billState: {
      type: String,
      enum: ["not_submitted", "pending", "confirmed", "disputed", "reviewed"],
      default: "not_submitted",
    },
    paymentMode: {
      type: String,
      enum: ["cash", "direct_upi", "servizato_online"],
    },
    claimedCollectedPaise: amount,
    paymentState: {
      type: String,
      enum: ["unpaid", "claimed", "paid", "refunded", "review", "not_required"],
      default: "unpaid",
    },
    submittedBy: { type: oid, ref: "User" },
    submittedAt: Date,
    confirmedBy: { type: oid, ref: "User" },
    confirmedAt: Date,
    disputeReason: String,
    reviewReason: String,
    reviewedBy: { type: oid, ref: "User" },
    reviewedAt: Date,
    onlineReceivedPaise: amount,
    unallocatedReceivedPaise: amount,
    unallocatedRefundedPaise: amount,
    refundedPaise: amount,
    collectedPaise: amount,
    payoutPaidPaise: amount,
    dueAt: Date,
    collectionId: { type: oid, ref: "CommissionCollection" },
    collectionReservedPaise: amount,
    version: { type: Number, default: 0 },
  },
  { autoIndex: false, autoCreate: false, timestamps: true },
);
ledgerSchema.index({ providerId: 1, dueAt: 1, _id: 1 });
ledgerSchema.index({ billState: 1, createdAt: -1 });
export const FinanceLedger: Model<FinanceLedgerData> =
  mongoose.models.FinanceLedger ||
  mongoose.model("FinanceLedger", ledgerSchema);
export interface FinanceEventData {
  _id: Types.ObjectId;
  dedupeKey: string;
  requestHash?: string;
  kind: string;
  actorId?: Types.ObjectId;
  actorRole: string;
  providerId?: Types.ObjectId;
  ledgerId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  resourceId?: Types.ObjectId;
  amountPaise?: number;
  externalKey?: string;
  reason?: string;
  details: Record<string, unknown>;
  createdAt: Date;
}
const eventSchema = new Schema<FinanceEventData>(
  {
    dedupeKey: { type: String, required: true, unique: true },
    requestHash: String,
    kind: { type: String, required: true },
    actorId: { type: oid, ref: "User" },
    actorRole: { type: String, required: true },
    providerId: { type: oid, ref: "ServiceProvider" },
    ledgerId: { type: oid, ref: "FinanceLedger" },
    invoiceId: { type: oid, ref: "Invoice" },
    resourceId: oid,
    amountPaise: { type: Number, validate: Number.isSafeInteger },
    externalKey: String,
    reason: { type: String, maxLength: 1000 },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  {
    autoIndex: false,
    autoCreate: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);
eventSchema.index(
  { externalKey: 1 },
  {
    unique: true,
    partialFilterExpression: { externalKey: { $type: "string" } },
  },
);
eventSchema.index({ providerId: 1, createdAt: -1 });
eventSchema.index({ ledgerId: 1, createdAt: -1 });
export const FinanceEvent: Model<FinanceEventData> =
  mongoose.models.FinanceEvent || mongoose.model("FinanceEvent", eventSchema);
export interface PayoutProfileData {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  method: "bank" | "upi";
  bankName?: string;
  masked: string;
  encrypted: string;
  version: number;
  status: "pending" | "verified" | "changes_requested";
  reviewReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  changedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const payoutSchema = new Schema<PayoutProfileData>(
  {
    providerId: {
      type: oid,
      ref: "ServiceProvider",
      required: true,
      unique: true,
    },
    method: { type: String, enum: ["bank", "upi"], required: true },
    bankName: String,
    masked: { type: String, required: true },
    encrypted: { type: String, required: true, select: false },
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "verified", "changes_requested"],
      default: "pending",
    },
    reviewReason: String,
    reviewedBy: { type: oid, ref: "User" },
    reviewedAt: Date,
    changedBy: { type: oid, ref: "User", required: true },
  },
  { autoIndex: false, autoCreate: false, timestamps: true },
);
payoutSchema.set("toJSON", {
  transform: (_doc, ret) => {
    Reflect.deleteProperty(ret, "encrypted");
    return ret;
  },
});
export const ProviderPayoutProfile: Model<PayoutProfileData> =
  mongoose.models.ProviderPayoutProfile ||
  mongoose.model("ProviderPayoutProfile", payoutSchema);
export interface CommissionCollectionData {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  activeKey?: string;
  reference: string;
  amountPaise: number;
  allocations: { ledgerId: Types.ObjectId; amountPaise: number }[];
  status: "creating" | "active" | "paid" | "expired" | "cancelled" | "review";
  gatewayLinkId?: string;
  gatewayOrderId?: string;
  shortUrl?: string;
  gatewayPaymentId?: string;
  expiresAt: Date;
  createdBy: Types.ObjectId;
  paidAt?: Date;
  lastCheckedAt?: Date;
  refundedPaise: number;
  createdAt: Date;
  updatedAt: Date;
}
const collectionSchema = new Schema<CommissionCollectionData>(
  {
    providerId: {
      type: oid,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },
    activeKey: String,
    reference: { type: String, required: true, unique: true },
    amountPaise: amount,
    allocations: [
      {
        _id: false,
        ledgerId: { type: oid, ref: "FinanceLedger", required: true },
        amountPaise: amount,
      },
    ],
    status: {
      type: String,
      enum: ["creating", "active", "paid", "expired", "cancelled", "review"],
      default: "creating",
    },
    gatewayLinkId: String,
    gatewayOrderId: String,
    shortUrl: String,
    gatewayPaymentId: String,
    expiresAt: { type: Date, required: true },
    createdBy: { type: oid, ref: "User", required: true },
    paidAt: Date,
    lastCheckedAt: Date,
    refundedPaise: amount,
  },
  { autoIndex: false, autoCreate: false, timestamps: true },
);
collectionSchema.index(
  { activeKey: 1 },
  { unique: true, partialFilterExpression: { activeKey: { $type: "string" } } },
);
collectionSchema.index(
  { gatewayLinkId: 1 },
  {
    unique: true,
    partialFilterExpression: { gatewayLinkId: { $type: "string" } },
  },
);
collectionSchema.index(
  { gatewayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { gatewayPaymentId: { $type: "string" } },
  },
);
export const CommissionCollection: Model<CommissionCollectionData> =
  mongoose.models.CommissionCollection ||
  mongoose.model("CommissionCollection", collectionSchema);
export interface CollectionReminderData {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  week: string;
  amountPaise: number;
  dueAt: Date;
  preparedBy?: Types.ObjectId;
  deliveredAt?: Date;
  createdAt: Date;
}
const reminderSchema = new Schema<CollectionReminderData>(
  {
    providerId: { type: oid, ref: "ServiceProvider", required: true },
    week: { type: String, required: true },
    amountPaise: amount,
    dueAt: { type: Date, required: true },
    preparedBy: { type: oid, ref: "User" },
    deliveredAt: Date,
  },
  {
    autoIndex: false,
    autoCreate: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);
reminderSchema.index({ providerId: 1, week: 1 }, { unique: true });
export const CollectionReminder: Model<CollectionReminderData> =
  mongoose.models.CollectionReminder ||
  mongoose.model("CollectionReminder", reminderSchema);
export interface CancellationCaseData {
  _id: Types.ObjectId;
  bookingId: Types.ObjectId;
  jobId?: Types.ObjectId;
  providerId: Types.ObjectId;
  customerId: Types.ObjectId;
  technicianId?: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: string;
  reason: string;
  note?: string;
  previousBookingStatus: string;
  previousJobStatus?: string;
  cancelledAt: Date;
  feedback?: "yes" | "no" | "not_sure" | "prefer_not";
  feedbackNote?: string;
  feedbackAt?: Date;
  reviewStatus:
    | "open"
    | "under_review"
    | "no_issue"
    | "confirmed_issue"
    | "action_taken";
  reviewReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const cancelSchema = new Schema<CancellationCaseData>(
  {
    bookingId: { type: oid, ref: "Booking", required: true, unique: true },
    jobId: { type: oid, ref: "Job" },
    providerId: { type: oid, ref: "ServiceProvider", required: true },
    customerId: { type: oid, ref: "Customer", required: true },
    technicianId: { type: oid, ref: "Technician" },
    actorId: { type: oid, ref: "User", required: true },
    actorRole: { type: String, required: true },
    reason: { type: String, required: true },
    note: String,
    previousBookingStatus: { type: String, required: true },
    previousJobStatus: String,
    cancelledAt: { type: Date, required: true },
    feedback: { type: String, enum: ["yes", "no", "not_sure", "prefer_not"] },
    feedbackNote: String,
    feedbackAt: Date,
    reviewStatus: {
      type: String,
      enum: [
        "open",
        "under_review",
        "no_issue",
        "confirmed_issue",
        "action_taken",
      ],
      default: "open",
    },
    reviewReason: String,
    reviewedBy: { type: oid, ref: "User" },
    reviewedAt: Date,
  },
  { autoIndex: false, autoCreate: false, timestamps: true },
);
cancelSchema.index({ providerId: 1, cancelledAt: -1 });
cancelSchema.index({ reviewStatus: 1, cancelledAt: -1 });
export const CancellationCase: Model<CancellationCaseData> =
  mongoose.models.CancellationCase ||
  mongoose.model("CancellationCase", cancelSchema);
