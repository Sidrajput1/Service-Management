import mongoose, { Schema } from "mongoose";
const schema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },
    publicId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "attached", "cleanup"],
      default: "pending",
    },
  },
  { timestamps: true },
);
export default mongoose.models.ProviderImageAsset ||
  mongoose.model("ProviderImageAsset", schema);
