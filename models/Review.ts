import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IReview
  extends Document {
  customerId: mongoose.Types.ObjectId;

  bookingId: mongoose.Types.ObjectId;

  jobId: mongoose.Types.ObjectId;

  serviceProviderId: mongoose.Types.ObjectId;

  technicianId: mongoose.Types.ObjectId;

  providerRating: number;

  technicianRating: number;

  comment?: string;

  status:
    | "published"
    | "hidden";

  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema =
  new Schema<IReview>(
    {
      customerId: {
        type: Schema.Types.ObjectId,
        ref: "Customer",
        required: true,
        index: true,
      },

      bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        unique: true,
      },

      jobId: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        unique: true,
      },

      serviceProviderId: {
        type: Schema.Types.ObjectId,
        ref: "ServiceProvider",
        required: true,
        index: true,
      },

      technicianId: {
        type: Schema.Types.ObjectId,
        ref: "Technician",
        required: true,
        index: true,
      },

      providerRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },

      technicianRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },

      comment: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },

      status: {
        type: String,
        enum: [
          "published",
          "hidden",
        ],
        default: "published",
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

ReviewSchema.index({
  serviceProviderId: 1,
  status: 1,
  createdAt: -1,
});

ReviewSchema.index({
  technicianId: 1,
  status: 1,
  createdAt: -1,
});

export const Review: Model<IReview> =
  mongoose.models.Review ||
  mongoose.model<IReview>(
    "Review",
    ReviewSchema,
  );

export default Review;