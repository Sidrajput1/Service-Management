// models/Technician.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITechnician extends Document {
  userId: mongoose.Types.ObjectId; // link to User model
  skills: string[]; // e.g. ["ac", "plumbing"]
  vehicleType?: string;
  status: "offline" | "available" | "busy" | "on_leave";
  currentLocation?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
    updatedAt?: Date;
  };
  rating?: number;
  jobsCompleted?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianSchema = new Schema<ITechnician>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: { type: [String], default: [] },
    vehicleType: String,
    status: { type: String, enum: ["offline", "available", "busy", "on_leave"], default: "offline" },
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
      updatedAt: Date,
    },
    rating: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

TechnicianSchema.index({ "currentLocation": "2dsphere" });

export const Technician: Model<ITechnician> =
  mongoose.models.Technician || mongoose.model<ITechnician>("Technician", TechnicianSchema);
export default Technician;