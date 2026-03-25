// models/Booking.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBooking extends Document {
  customerId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
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
  estimatedPrice?: number;
  status: "pending" | "confirmed" | "assigned" | "cancelled" | "rescheduled";
  createdBy?: mongoose.Types.ObjectId; // user who created booking
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    serviceType: { type: String, required: true },
    subService: String,
    scheduledAt: Date,
    timeWindow: {
      from: Date,
      to: Date,
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
    status: { type: String, enum: ["pending", "confirmed", "assigned", "cancelled", "rescheduled"], default: "pending" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
  },
  { timestamps: true }
);

BookingSchema.index({ "address.location": "2dsphere" });

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;