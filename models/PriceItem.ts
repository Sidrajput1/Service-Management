import mongoose, { Schema, Document, Model } from "mongoose";

export type PriceItemType = "service" | "part" | "visit" | "other";

export interface IPriceItem extends Document {
  itemType: PriceItemType;
  name: String;
  price: Number;
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

export const PriceItem: Model<IPriceItem> =
  mongoose.models.PriceItem ||
  mongoose.model<IPriceItem>("PriceItem", PriceItemSchema);

export default PriceItem;
