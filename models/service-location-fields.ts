import { Schema, type Query } from "mongoose";
import {
  stripServiceLocations,
  validCoordinates,
} from "@/lib/service-location.mjs";
export interface LocationConfirmation {
  source: "customer_gps";
  confirmedBy: import("mongoose").Types.ObjectId;
  confirmedAt: Date;
  capturedAt: Date;
  accuracyMeters: number;
  addressIdentity: string;
}
const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: validCoordinates,
        message: "Invalid longitude/latitude pair",
      },
    },
  },
  { _id: false },
);
const confirmationSchema = new Schema(
  {
    source: { type: String, enum: ["customer_gps"], required: true },
    confirmedBy: { type: Schema.Types.ObjectId, required: true },
    confirmedAt: { type: Date, required: true },
    capturedAt: { type: Date, required: true },
    accuracyMeters: { type: Number, min: 0, max: 50, required: true },
    addressIdentity: { type: String, required: true },
  },
  { _id: false },
);
export const serviceLocationFields = {
  location: { type: pointSchema, default: undefined, select: false },
  locationConfirmation: {
    type: confirmationSchema,
    default: undefined,
    select: false,
  },
};
export function installServiceLocationPrivacy(schema: Schema) {
  schema.set("toJSON", {
    transform: (_document, returned) => {
      stripServiceLocations(returned);
      return returned;
    },
  });
  schema.post(
    /^find/,
    function (this: Query<unknown, unknown>, result: unknown) {
      if (
        this.mongooseOptions().lean &&
        !this.getOptions().includeServiceLocation
      )
        stripServiceLocations(result);
    },
  );
  schema.post("aggregate", function (result: unknown) {
    stripServiceLocations(result);
  });
}
