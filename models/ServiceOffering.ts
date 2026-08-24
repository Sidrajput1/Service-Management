import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export type DiscountType =
  | "percentage"
  | "flat";
export interface IServiceOffering
  extends Document {
  serviceProviderId: mongoose.Types.ObjectId;
  priceItemId: mongoose.Types.ObjectId;

  name: string;

  price: number;

  taxPercent: number;

  description?: string;

  isActive: boolean;

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

const ServiceOfferingSchema =
  new Schema<IServiceOffering>(
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
    }
  );

ServiceOfferingSchema.index(
  {
    serviceProviderId: 1,
    priceItemId: 1,
  },
  {
    unique: true,
  }
);

export const ServiceOffering: Model<IServiceOffering> =
  mongoose.models.ServiceOffering ||
  mongoose.model<IServiceOffering>(
    "ServiceOffering",
    ServiceOfferingSchema
  );

export default ServiceOffering;