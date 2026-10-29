import { Schema, type Types } from "mongoose";
export interface ArrivalTracking {
  destinationKey: string;
  technicianId: Types.ObjectId;
  lastReceivedAt: Date;
  lastObservedAt: Date;
  qualifyingCount: number;
  lastQualifiedAt?: Date;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  pointObservedAt?: Date;
}
export interface ArrivalNotification {
  state: "pending" | "sent";
  recipientUserId?: Types.ObjectId;
  attempts: number;
  sentAt?: Date;
}
export const arrivalTrackingSchema = new Schema(
  {
    destinationKey: String,
    technicianId: Schema.Types.ObjectId,
    lastReceivedAt: Date,
    lastObservedAt: Date,
    qualifyingCount: Number,
    lastQualifiedAt: Date,
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    pointObservedAt: Date,
  },
  { _id: false },
);
export const arrivalNotificationSchema = new Schema(
  {
    state: { type: String, enum: ["pending", "sent"] },
    recipientUserId: Schema.Types.ObjectId,
    attempts: { type: Number, default: 0 },
    sentAt: Date,
  },
  { _id: false },
);
