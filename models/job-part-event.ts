import mongoose, { Schema, type Types } from "mongoose";

type PartSnapshot = {
  partName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
};
export interface JobPartEventData {
  _id: string;
  jobId: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: "technician";
  actorName: string;
  action: "part_added" | "part_updated" | "part_removed";
  partId: string;
  before?: PartSnapshot;
  after?: PartSnapshot;
  totalBefore: number;
  totalAfter: number;
  createdAt: Date;
  requestHash: string;
}
const snapshot = new Schema<PartSnapshot>(
  {
    partName: String,
    qty: Number,
    unitPrice: Number,
    lineTotal: Number,
    note: String,
  },
  { _id: false },
);
const schema = new Schema<JobPartEventData>({
  _id: { type: String, required: true },
  jobId: { type: Schema.Types.ObjectId, required: true },
  actorId: { type: Schema.Types.ObjectId, required: true },
  actorRole: { type: String, enum: ["technician"], required: true },
  actorName: { type: String, required: true },
  action: {
    type: String,
    enum: ["part_added", "part_updated", "part_removed"],
    required: true,
  },
  partId: { type: String, required: true },
  before: { type: snapshot, default: undefined },
  after: { type: snapshot, default: undefined },
  totalBefore: { type: Number, required: true },
  totalAfter: { type: Number, required: true },
  createdAt: { type: Date, required: true },
  requestHash: { type: String, required: true, select: false },
});
// Corrections append an event in the same transaction as the job change.
schema.pre("save", function () {
  if (!this.isNew) throw new Error("Job part history is append-only.");
});
schema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "findOneAndReplace",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ],
  function () {
    throw new Error("Job part history is append-only.");
  },
);
schema.index({ jobId: 1, createdAt: 1 });
const JobPartEvent =
  (mongoose.models.JobPartEvent as
    | mongoose.Model<JobPartEventData>
    | undefined) || mongoose.model<JobPartEventData>("JobPartEvent", schema);
export default JobPartEvent;
