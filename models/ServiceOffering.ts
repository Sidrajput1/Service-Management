import mongoose, { Document, Model, Schema } from "mongoose";
import { offeringApprovalStatuses } from "@/lib/moderation-policy.mjs";
import { reviewDecisionSchema, type ReviewDecision } from "./review-fields";

export type DiscountType = "percentage" | "flat";
export interface IServiceOffering extends Document {
  serviceProviderId: mongoose.Types.ObjectId;
  priceItemId: mongoose.Types.ObjectId;

  name: string;

  price: number;
  pricingModel?: "fixed" | "starting" | "per_unit" | "quote_required";
  unit?: string;

  taxPercent: number;

  description?: string;

  isActive: boolean;
  approvalStatus?: "pending" | "approved" | "changes_requested" | "rejected";
  reviewVersion?: number;
  reviewSubmittedAt?: Date;
  lastReview?: ReviewDecision;
  currency?: "INR";

  // Promotional offer
  offerEnabled: boolean;
  offerName?: string;

  discountType?: DiscountType;
  discountValue?: number;

  offerStartsAt?: Date;
  offerEndsAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ServiceOfferingSchema = new Schema<IServiceOffering>(
  {
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },

    priceItemId: {
      type: Schema.Types.ObjectId,
      ref: "PriceItem",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
    pricingModel: {
      type: String,
      enum: ["fixed", "starting", "per_unit", "quote_required"],
      default: "fixed",
    },
    unit: { type: String, default: "job" },

    taxPercent: {
      type: Number,
      default: 18,
      min: 0,
    },

    description: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    approvalStatus: {
      type: String,
      enum: offeringApprovalStatuses,
      default: "pending",
    },
    reviewVersion: { type: Number, default: 0 },
    reviewSubmittedAt: Date,
    lastReview: reviewDecisionSchema,
    currency: { type: String, enum: ["INR"], default: "INR" },
    // -----------------------------
    // OFFER / DISCOUNT
    // -----------------------------

    offerEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },

    offerName: {
      type: String,
      trim: true,
      default: "",
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
    },

    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    offerStartsAt: Date,

    offerEndsAt: Date,
  },
  {
    timestamps: true,
  },
);

ServiceOfferingSchema.index(
  {
    serviceProviderId: 1,
    priceItemId: 1,
  },
  {
    unique: true,
  },
);

ServiceOfferingSchema.index({ approvalStatus: 1, _id: -1 });
ServiceOfferingSchema.index({
  approvalStatus: 1,
  isActive: 1,
  priceItemId: 1,
  _id: -1,
});
ServiceOfferingSchema.index({
  serviceProviderId: 1,
  approvalStatus: 1,
  _id: -1,
});

export const ServiceOffering: Model<IServiceOffering> =
  mongoose.models.ServiceOffering ||
  mongoose.model<IServiceOffering>("ServiceOffering", ServiceOfferingSchema);

export default ServiceOffering;
