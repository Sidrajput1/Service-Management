import { Schema, Types } from "mongoose";
export interface CommissionSnapshot {
  state: "ready" | "missing_policy" | "terms_pending" | "legacy_review";
  policyId?: Types.ObjectId;
  rateBps?: number;
  basis?: "invoice_before_tax";
  scope?: string;
  scopeKey?: string;
  termsVersion?: string;
  acceptedAt?: Date;
  establishedAt: Date;
  collectionDays?: number;
}
export const commissionSnapshotSchema = new Schema<CommissionSnapshot>(
  {
    state: {
      type: String,
      enum: ["ready", "missing_policy", "terms_pending", "legacy_review"],
      required: true,
    },
    policyId: { type: Schema.Types.ObjectId, ref: "CommissionPolicy" },
    rateBps: { type: Number, min: 0, max: 10000 },
    basis: { type: String, enum: ["invoice_before_tax"] },
    scope: String,
    scopeKey: String,
    termsVersion: String,
    acceptedAt: Date,
    establishedAt: { type: Date, required: true },
    collectionDays: Number,
  },
  { _id: false },
);
