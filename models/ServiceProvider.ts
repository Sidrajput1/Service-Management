import mongoose, { Document, Model, Schema } from "mongoose";

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

  verificationStatus:
    | "pending"
    | "verified"
    | "rejected";

  status:
    | "active"
    | "inactive"
    | "suspended";

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

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },

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
  }
);

ServiceProviderSchema.index({
  "address.location": "2dsphere",
});

export const ServiceProvider: Model<IServiceProvider> =
  mongoose.models.ServiceProvider ||
  mongoose.model<IServiceProvider>(
    "ServiceProvider",
    ServiceProviderSchema
  );

export default ServiceProvider;