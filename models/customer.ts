// models/Customer.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAddress {
  label?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  metadata?: Record<string, any>;
}

export interface ICustomer extends Document {
  userId?: mongoose.Types.ObjectId; // optional link to User
  name: string;
  phone: string;
  email?: string;
  addresses: IAddress[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    label: String,
    addressLine: String,
    city: String,
    state: String,
    pincode: String,
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    metadata: Schema.Types.Mixed,
  },
  { _id: false },
);

AddressSchema.index({ location: "2dsphere" });

const CustomerSchema = new Schema<ICustomer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User",unique:true,sparse:true },
    name: { type: String, required: true },
    phone: { type: String, index: true },
    email: String,
    addresses: { type: [AddressSchema], default: [] },
    notes: String,
  },
  { timestamps: true },
);

export const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;
