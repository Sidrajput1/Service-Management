import {
  serviceLocationFields,
  installServiceLocationPrivacy,
  type LocationConfirmation,
} from "./service-location-fields";
import mongoose, { Document, Model, Schema } from "mongoose";
import {
  requestCoverageSchema,
  destinationConfirmationSchema,
  type RequestCoverage,
  type DestinationConfirmation,
} from "./request-coverage-fields";

export type ServiceRequestStatus =
  | "open"
  | "accepted"
  | "declined"
  | "booked"
  | "cancelled"
  | "expired";

export interface IServiceRequest extends Document {
  repeatOfBookingId?: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  requestKey?: string;
  requestHash?: string;
  coverage?: RequestCoverage;
  destinationConfirmation?: DestinationConfirmation;
  declinedBy?: mongoose.Types.ObjectId;
  declinedAt?: Date;
  declineReason?: string;

  serviceProviderId?: mongoose.Types.ObjectId;
  serviceOfferingId: mongoose.Types.ObjectId;

  priceItemId: mongoose.Types.ObjectId;

  serviceName: string;
  requiredSkillKeys?: string[];

  description?: string;

  address: {
    addressLine?: string;
    city?: string;
    state?: string;
    locality?: string;
    pincode?: string;

    locationConfirmation?: LocationConfirmation;
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
    pricingModel?: string;
    unit?: string;
    quantity?: number;
  };

  status: ServiceRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRequestPricingSchema = new Schema(
  {
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    pricingModel: String,
    unit: String,
    quantity: { type: Number, min: 1, default: 1 },

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
  { _id: false },
);

const ServiceRequestSchema = new Schema<IServiceRequest>(
  {
    repeatOfBookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    requestKey: { type: String, select: false },
    requestHash: { type: String, select: false },
    coverage: { type: requestCoverageSchema },
    destinationConfirmation: {
      type: destinationConfirmationSchema,
      select: false,
    },
    declinedBy: { type: Schema.Types.ObjectId, ref: "User" },
    declinedAt: Date,
    declineReason: { type: String, maxlength: 500 },
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
    requiredSkillKeys: { type: [String], default: [] },

    description: {
      type: String,
      default: "",
    },

    address: {
      addressLine: String,
      city: String,
      state: String,
      locality: String,
      pincode: String,

      ...serviceLocationFields,
    },

    preferredDate: Date,

    pricing: {
      type: ServiceRequestPricingSchema,
      required: true,
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
      enum: ["open", "accepted", "declined", "booked", "cancelled", "expired"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

installServiceLocationPrivacy(ServiceRequestSchema);
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
ServiceRequestSchema.index(
  { customerId: 1, requestKey: 1 },
  {
    unique: true,
    partialFilterExpression: { requestKey: { $type: "string" } },
  },
);
ServiceRequestSchema.index({ serviceProviderId: 1, status: 1, _id: -1 });
ServiceRequestSchema.index({ customerId: 1, _id: -1 });

export const ServiceRequest: Model<IServiceRequest> =
  mongoose.models.ServiceRequest ||
  mongoose.model<IServiceRequest>("ServiceRequest", ServiceRequestSchema);

export default ServiceRequest;
