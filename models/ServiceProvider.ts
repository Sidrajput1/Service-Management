import mongoose, { Document, Model, Schema } from "mongoose";
import { providerVerificationStatuses } from "@/lib/moderation-policy.mjs";
import { reviewDecisionSchema, type ReviewDecision } from "./review-fields";

export interface IServiceProvider extends Document {
  ownerId: mongoose.Types.ObjectId;

  companyName: string;
  businessType?: string;
  description?: string;

  email: string;
  phone: string;

  address?: {
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    location?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  onboardingCompletedAt?: Date;

  services: mongoose.Types.ObjectId[];

  serviceAreas: string[];
  coverageVersion?: number;
  coverageAreas?: {
    _id: string;
    city: string;
    state: string;
    locality?: string;
    pincode?: string;
    cityKey: string;
    stateKey: string;
    localityKey: string;
    isActive: boolean;
  }[];
  businessImage?: {
    url: string;
    publicId: string;
    bytes: number;
    format: string;
    width: number;
    height: number;
  } | null;
  ratingSummary?: {
    average: number;
    count: number;
    score: number;
    updatedAt: Date;
  };

  verificationStatus: "pending" | "changes_requested" | "verified" | "rejected";
  reviewVersion?: number;
  reviewSubmittedAt?: Date;
  lastReview?: ReviewDecision;

  status: "active" | "inactive" | "suspended";

  trialStartedAt?: Date;
  trialEndsAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ServiceProviderSchema = new Schema<IServiceProvider>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      addressLine: String,
      city: String,
      state: String,
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
    // onboardingCompletedAt: Date,
    onboardingCompletedAt: {
      type: Date,
      default: null,
    },

    services: [
      {
        type: Schema.Types.ObjectId,
        ref: "PriceItem",
      },
    ],

    serviceAreas: {
      type: [String],
      default: [],
    },
    coverageVersion: Number,
    coverageAreas: [
      {
        _id: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        locality: String,
        pincode: String,
        cityKey: String,
        stateKey: String,
        localityKey: String,
        isActive: { type: Boolean, default: true },
      },
    ],
    businessImage: {
      type: new Schema(
        {
          url: String,
          publicId: String,
          bytes: Number,
          format: String,
          width: Number,
          height: Number,
        },
        { _id: false },
      ),
      default: null,
    },
    ratingSummary: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      updatedAt: Date,
    },

    verificationStatus: {
      type: String,
      enum: providerVerificationStatuses,
      default: "pending",
      index: true,
    },

    reviewVersion: { type: Number, default: 0 },
    reviewSubmittedAt: Date,
    lastReview: reviewDecisionSchema,
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    trialStartedAt: {
      type: Date,
    },

    trialEndsAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

ServiceProviderSchema.index({
  "address.location": "2dsphere",
});
ServiceProviderSchema.index({ verificationStatus: 1, _id: -1 });

export const ServiceProvider: Model<IServiceProvider> =
  mongoose.models.ServiceProvider ||
  mongoose.model<IServiceProvider>("ServiceProvider", ServiceProviderSchema);

export default ServiceProvider;
