// models/JobProof.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJobProof extends Document {
  jobId: mongoose.Types.ObjectId;
  uploadedBy?: mongoose.Types.ObjectId; // technician user id
  type?: "photo" | "before_photo" | "after_photo" | "signature" | "video" | "other";
  url: string;
  thumbnailUrl?: string;
  metadata?: {
    lat?: number;
    lng?: number;
    device?: string;
    timestamp?: Date;
    exif?: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const JobProofSchema = new Schema<IJobProof>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String },
    url: { type: String, required: true },
    thumbnailUrl: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const JobProof: Model<IJobProof> =
  mongoose.models.JobProof || mongoose.model<IJobProof>("JobProof", JobProofSchema);
export default JobProof;