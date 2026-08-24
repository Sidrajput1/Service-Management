// models/Booking.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBooking extends Document {
  customerId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  serviceProviderId?:mongoose.Types.ObjectId;
  serviceOfferingId?:mongoose.Types.ObjectId;
  technicianId?:mongoose.Types.ObjectId;
  serviceType: string;
  subService?: string;
  scheduledAt?: Date; // preferred datetime
  timeWindow?: { from?: Date; to?: Date };
  address?: {
    addressLine?: string;
    city?: string;
    pincode?: string;
    location?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  pricing:{
    basePrice: number;
    discountAmount: number;
    finalPrice: number;

    discountType?: "percentage" | "flat";
    discountValue?: number;

    offerName?: string;
  };
  estimatedPrice?: number;
  status: "pending" | "confirmed" | "assigned" | "cancelled" | "rescheduled";
  createdBy?: mongoose.Types.ObjectId; // user who created booking
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

const BookingPricingSchema = new Schema(
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

const BookingSchema = new Schema<IBooking>(
  {
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
      pincode: String,
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
      },
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

BookingSchema.index({ "address.location": "2dsphere" });

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;
