import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export type ServiceRequestStatus = 
  | "open"
  | "accepted"
  | "declined"
  | "booked"
  | "cancelled"
  | "expired"

export interface IServiceRequest
  extends Document {
  customerId: mongoose.Types.ObjectId;

  serviceProviderId?: mongoose.Types.ObjectId;
  serviceOfferingId: mongoose.Types.ObjectId;

  priceItemId: mongoose.Types.ObjectId;

  serviceName: string;

  description?: string;

  address: {
    addressLine?: string;
    city?: string;
    pincode?: string;

    location?: {
      type: "Point";
      coordinates: [number, number];
    };
  };

  preferredDate?: Date;

  pricing: {
    basePrice: number;
    discountAmount: number;
    finalPrice: number;

    discountType?: "percentage" | "flat";
    discountValue?: number;

    offerName?: string;
    taxPercent?: number;
  };

  status: ServiceRequestStatus;
  createdAt: Date;
  updatedAt: Date;
};

const ServiceRequestPricingSchema =
  new Schema(
    {
      basePrice: {
        type: Number,
        required: true,
        min: 0,
      },

      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      finalPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      discountType: {
        type: String,
        enum: ["percentage", "flat"],
      },

      discountValue: {
        type: Number,
        default: 0,
      },

      offerName: {
        type: String,
        default: "",
      },
      taxPercent: {
      type: Number,
      default: 18,
      min: 0,
    },
    },
    { _id: false }
  );

const ServiceRequestSchema =
  new Schema<IServiceRequest>(
    {
      customerId: {
        type: Schema.Types.ObjectId,
        ref: "Customer",
        required: true,
        index: true,
      },
      serviceProviderId: {
        type: Schema.Types.ObjectId,
        ref: "ServiceProvider",
        index: true,
      },

      serviceOfferingId: {
        type: Schema.Types.ObjectId,
        ref: "ServiceOffering",
        required: true,
        index: true,
      },

      priceItemId: {
        type: Schema.Types.ObjectId,
        ref: "PriceItem",
        required: true,
        index: true,
      },

      serviceName: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        default: "",
      },

      address: {
        addressLine: String,
        city: String,
        pincode: String,

        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
          },

          coordinates: {
            type: [Number],
            default: [0, 0],
          },
        },
      },

      preferredDate: Date,

      pricing:{
        type:ServiceRequestPricingSchema,
        required:true,
      },

      status: {
        type: String,
        // enum: [
        //   "open",
        //   "provider_selected",
        //   "booked",
        //   "cancelled",
        //   "expired",
        // ],
        enum: [
          "open",
          "accepted",
          "declined",
          "booked",
          "cancelled",
          "expired",
        ],
        default: "open",
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

ServiceRequestSchema.index({
  "address.location": "2dsphere",
});

ServiceRequestSchema.index({
  serviceProviderId: 1,
  status: 1,
  createdAt: -1,
});

ServiceRequestSchema.index({
  customerId: 1,
  createdAt: -1,
});

export const ServiceRequest: Model<IServiceRequest> =
  mongoose.models.ServiceRequest ||
  mongoose.model<IServiceRequest>(
    "ServiceRequest",
    ServiceRequestSchema
  );

export default ServiceRequest;