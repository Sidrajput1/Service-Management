import mongoose, { Schema } from "mongoose";

export type Role = "admin" | "dispatcher" | "technician" | "customer";

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, index: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, index: true },
    role: {
      type: String,
      enum: ["admin", "dispatcher", "technician", "customer"],
      default: "customer",
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const User = mongoose.models.user || mongoose.model("user", UserSchema);

export default User;
