import mongoose, { Schema, Document, Model } from "mongoose";

export type PriceItemType = "service" | "part" | "visit" | "other";

export interface IPriceItem extends Document {
  itemType: PriceItemType;
  catalogKey?: string;
  normalizedName?: string;
  reviewVersion?: number;
  categoryKey?: string;
  skillKeys?: string[];
  suggestedPrice?: {
    amount: number;
    currency: string;
    unit: string;
    city?: string;
    sourceUrl?: string;
    checkedAt?: string;
    kind: "public_listing" | "configured";
    qualification?: string;
  } | null;
  name: string;
  price: number;
  unit?: string;
  taxPercent?: number;
  isActive: boolean;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PriceItemSchema = new Schema<IPriceItem>(
  {
    itemType: {
      type: "String",
      enum: ["service", "part", "visit", "other"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    catalogKey: { type: String, trim: true },
    normalizedName: { type: String, trim: true },
    reviewVersion: { type: Number, default: 0 },
    categoryKey: { type: String, trim: true },
    skillKeys: { type: [String], default: [] },
    suggestedPrice: {
      amount: Number,
      currency: String,
      unit: String,
      city: String,
      sourceUrl: String,
      checkedAt: String,
      kind: { type: String, enum: ["public_listing", "configured"] },
      qualification: String,
    },
    price: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, default: "" },
    taxPercent: { type: Number, default: 18, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, default: "" },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true },
);

PriceItemSchema.index({ itemType: 1, name: 1 }, { unique: true });
PriceItemSchema.index(
  { catalogKey: 1 },
  {
    unique: true,
    partialFilterExpression: { catalogKey: { $type: "string" } },
  },
);

PriceItemSchema.index(
  { itemType: 1, normalizedName: 1 },
  {
    unique: true,
    partialFilterExpression: { normalizedName: { $type: "string" } },
  },
);
PriceItemSchema.index({ itemType: 1, isActive: 1, _id: -1 });

export const PriceItem: Model<IPriceItem> =
  mongoose.models.PriceItem ||
  mongoose.model<IPriceItem>("PriceItem", PriceItemSchema);

export default PriceItem;
