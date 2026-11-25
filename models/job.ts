import { stripServiceLocations } from "@/lib/service-location.mjs";
import {
  arrivalTrackingSchema,
  arrivalNotificationSchema,
  type ArrivalTracking,
  type ArrivalNotification,
} from "./arrival-fields";
// models/Job.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { quotePricingSchema, type QuotePricing } from "./job-quote";

export interface IJob extends Document {
  arrivalVersion?: number;
  arrivalTracking?: ArrivalTracking;
  arrivalNotification?: ArrivalNotification;
  arrivalMethod?: "manual" | "automatic";
  arrivalActorId?: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  serviceProviderId: mongoose.Types.ObjectId;
  technicianId?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  scheduledAt?: Date;
  scheduledEndAt?: Date;
  paymentReceivedAt?: Date;
  paymentMethod?: string;
  status:
    | "scheduled"
    | "assigned"
    | "enroute"
    | "arrived"
    | "otp_verified"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled";

  otp?: string;
  otpVersion?: number;
  otpAttempts?: number;
  otpLockedAt?: Date;
  paymentStatus?:
    | "unbilled"
    | "pending"
    | "partial"
    | "paid"
    | "refunded"
    | "not_required";
  otpExpiresAt?: Date;
  startTime?: Date;
  endTime?: Date;
  proofRequired?: boolean;
  proofSubmittedAt?: Date;
  proofIds?: mongoose.Types.ObjectId[]; // references to JobProofs
  partsUsed?: JobPart[];
  partsVersion?: number;
  partsDraftVersion?: number;
  quotedPartsDraftVersion?: number;
  quoteVersion?: number;
  latestQuoteId?: string;
  authorizedQuoteId?: string;
  customerApprovedQuoteId?: string;
  finalQuote?: QuotePricing;
  notes?: string;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  arrivedAt?: Date;
  customerOtpVerifiedAt?: Date;
}

export interface JobPart {
  partId?: string;
  partName: string;
  qty: number;
  price?: number;
  source?: "on_site";
  priceItemId?: mongoose.Types.ObjectId;
  note?: string;
}

const JobSchema = new Schema<IJob>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },

    technicianId: { type: Schema.Types.ObjectId, ref: "Technician" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    scheduledAt: Date,
    scheduledEndAt: Date,
    paymentReceivedAt: Date,
    paymentMethod: String,
    status: {
      type: String,
      enum: [
        "scheduled",
        "assigned",
        "enroute",
        "arrived",
        "otp_verified",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
      default: "scheduled",
    },
    otp: { type: String, select: false },
    otpVersion: { type: Number, select: false },
    otpAttempts: { type: Number, select: false },
    otpLockedAt: { type: Date, select: false },
    paymentStatus: {
      type: String,
      enum: [
        "unbilled",
        "pending",
        "partial",
        "paid",
        "refunded",
        "not_required",
      ],
      default: "unbilled",
    },
    otpExpiresAt: { type: Date, select: false },
    startTime: Date,
    endTime: Date,
    proofRequired: { type: Boolean, default: true },
    proofSubmittedAt: Date,
    proofIds: [{ type: Schema.Types.ObjectId, ref: "JobProof" }],
    partsUsed: [
      {
        partId: String,
        partName: String,
        qty: Number,
        price: Number,
        source: { type: String, enum: ["on_site"] },
        priceItemId: { type: Schema.Types.ObjectId, ref: "PriceItem" },
        note: String,
      },
    ],
    partsVersion: Number,
    partsDraftVersion: Number,
    quotedPartsDraftVersion: Number,
    quoteVersion: Number,
    latestQuoteId: String,
    authorizedQuoteId: String,
    customerApprovedQuoteId: String,
    finalQuote: { type: quotePricingSchema, default: undefined, select: false },
    notes: String,
    acceptedAt: Date,
    arrivedAt: Date,
    arrivalVersion: { type: Number, default: 0 },
    arrivalTracking: {
      type: arrivalTrackingSchema,
      select: false,
      default: undefined,
    },
    arrivalNotification: {
      type: arrivalNotificationSchema,
      select: false,
      default: undefined,
    },
    arrivalMethod: { type: String, enum: ["manual", "automatic"] },
    arrivalActorId: { type: Schema.Types.ObjectId, ref: "User" },
    customerOtpVerifiedAt: Date,
  },
  { timestamps: true },
);

JobSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.otp;
    delete ret.otpExpiresAt;
    delete ret.otpVersion;
    delete ret.otpAttempts;
    delete ret.otpLockedAt;
    delete ret.finalQuote;
    delete ret.arrivalTracking;
    delete ret.arrivalNotification;
    stripServiceLocations(ret);
    return ret;
  },
});
JobSchema.pre("save", function () {
  if (this.isModified("status") && this.status !== "enroute")
    this.set("arrivalTracking", undefined);
});
JobSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) return;
  const status = update.$set?.status || update.status;
  if (status && status !== "enroute")
    update.$unset = { ...update.$unset, arrivalTracking: 1 };
});
JobSchema.post("aggregate", function (result: unknown) {
  stripServiceLocations(result);
});
JobSchema.index({ "arrivalNotification.state": 1, _id: 1 });
JobSchema.index({
  serviceProviderId: 1,
  status: 1,
});

JobSchema.index({
  technicianId: 1,
  status: 1,
});

JobSchema.index({ bookingId: 1, serviceProviderId: 1 });
export const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);
export default Job;
