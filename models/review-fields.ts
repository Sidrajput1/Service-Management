import { Schema } from "mongoose";
export const reviewDecisionSchema = new Schema(
  {
    action: String,
    reason: { type: String, maxlength: 1000 },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: Date,
  },
  { _id: false },
);
export interface ReviewDecision {
  action?: string;
  reason?: string;
  actorId?: import("mongoose").Types.ObjectId;
  decidedAt?: Date;
}
