import {
  serviceLocationFields,
  installServiceLocationPrivacy,
  type LocationConfirmation,
} from "./service-location-fields";
// models/Booking.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { commissionSnapshotSchema, type CommissionSnapshot } from "./finance-fields";
import {
  requestCoverageSchema,
  destinationConfirmationSchema,
  type RequestCoverage,
  type DestinationConfirmation,
} from "./request-coverage-fields";

export interface IBooking extends Document {
  commissionSnapshot?: CommissionSnapshot;
  repeatOfBookingId?: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  coverage?: RequestCoverage;
  destinationConfirmation?: DestinationConfirmation;
  leadId?: mongoose.Types.ObjectId;
  serviceProviderId?: mongoose.Types.ObjectId;
  serviceOfferingId?: mongoose.Types.ObjectId;
  technicianId?: mongoose.Types.ObjectId;
  serviceType: string;
  requiredSkillKeys?: string[];
  subService?: string;
  scheduledAt?: Date; // preferred datetime
  timeWindow?: { from?: Date; to?: Date };
  address?: {
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
  estimatedPrice?: number;
  status: "pending" | "confirmed" | "assigned" | "cancelled" | "rescheduled";
  createdBy?: mongoose.Types.ObjectId; // user who created booking
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingPricingSchema = new Schema(
  {
    coverage: { type: requestCoverageSchema },
    destinationConfirmation: {
      type: destinationConfirmationSchema,
      select: false,
    },
    pricingModel: String,
    unit: String,
    quantity: { type: Number, min: 1, default: 1 },
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
  { _id: false },
);

const BookingSchema = new Schema<IBooking>(
  {
    commissionSnapshot: { type: commissionSnapshotSchema, select: false },
    repeatOfBookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    requiredSkillKeys: { type: [String], default: [] },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "Technician",
    },
    serviceOfferingId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceOffering",
      required: true,
      index: true,
    },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    serviceType: { type: String, required: true },
    subService: String,
    scheduledAt: Date,
    timeWindow: {
      from: Date,
      to: Date,
    },
    pricing: {
      type: BookingPricingSchema,
      required: true,
    },
    address: {
      addressLine: String,
      city: String,
      state: String,
      locality: String,
      pincode: String,
      ...serviceLocationFields,
    },

    estimatedPrice: Number,
    status: {
      type: String,
      enum: ["pending", "confirmed", "assigned", "cancelled", "rescheduled"],
      default: "pending",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
  },
  { timestamps: true },
);

installServiceLocationPrivacy(BookingSchema);
BookingSchema.index({ "address.location": "2dsphere" });
BookingSchema.index({ customerId: 1, _id: -1 });

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;
