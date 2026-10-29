import { Schema, type Types } from "mongoose";

export interface RequestCoverage {
  status: "matched" | "outside" | "uncertain";
  requiresProviderConfirmation: boolean;
  assessedAt: Date;
  addressIdentity: string;
  acceptanceStatus?: "matched" | "outside" | "uncertain";
  providerConfirmedBy?: Types.ObjectId;
  providerConfirmedAt?: Date;
  providerConfirmedAddressIdentity?: string;
}
export interface DestinationConfirmation {
  confirmedBy: Types.ObjectId;
  confirmedAt: Date;
  addressIdentity: string;
}
export const requestCoverageSchema = new Schema<RequestCoverage>(
  {
    status: {
      type: String,
      enum: ["matched", "outside", "uncertain"],
      required: true,
    },
    requiresProviderConfirmation: { type: Boolean, required: true },
    assessedAt: { type: Date, required: true },
    addressIdentity: { type: String, required: true },
    acceptanceStatus: {
      type: String,
      enum: ["matched", "outside", "uncertain"],
    },
    providerConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    providerConfirmedAt: Date,
    providerConfirmedAddressIdentity: String,
  },
  { _id: false },
);
export const destinationConfirmationSchema =
  new Schema<DestinationConfirmation>(
    {
      confirmedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      confirmedAt: { type: Date, required: true },
      addressIdentity: { type: String, required: true },
    },
    { _id: false },
  );
