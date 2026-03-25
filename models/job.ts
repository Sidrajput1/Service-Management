// models/Job.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJob extends Document {
  bookingId: mongoose.Types.ObjectId;
  technicianId?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  scheduledAt?: Date;
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
  otpExpiresAt?: Date;
  startTime?: Date;
  endTime?: Date;
  proofRequired?: boolean;
  proofSubmittedAt?: Date;
  proofIds?: mongoose.Types.ObjectId[]; // references to JobProofs
  partsUsed?: { partName: string; qty: number; price?: number }[];
  notes?: string;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    technicianId: { type: Schema.Types.ObjectId, ref: "Technician" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    scheduledAt: Date,
    status: {
      type: String,
      enum: [
        "scheduled",
        "assigned",
        "accepted",
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
    otp: String,
    otpExpiresAt: Date,
    startTime: Date,
    endTime: Date,
    proofRequired: { type: Boolean, default: true },
    proofSubmittedAt: Date,
    proofIds: [{ type: Schema.Types.ObjectId, ref: "JobProof" }],
    partsUsed: [{ partName: String, qty: Number, price: Number }],
    notes: String,
    acceptedAt: Date,
  },
  { timestamps: true }
);

export const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);
export default Job;