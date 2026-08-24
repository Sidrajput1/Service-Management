import mongoose from "mongoose";
import Review from "@/models/Review";

export async function getProviderRatingSummary(serviceProviderId: string) {
  const providerObjectId = new mongoose.Types.ObjectId(serviceProviderId);

  const result = await Review.aggregate([
    {
      $match: {
        serviceProviderId: providerObjectId,
        status: "published",
      },
    },

    {
      $group: {
        _id: null,

        averageRating: {
          $avg: "$providerRating",
        },

        reviewCount: {
          $sum: 1,
        },
      },
    },
  ]);

  const summary = result[0];

  if (!summary) {
    return {
      averageRating: 0,
      reviewCount: 0,
    };
  }

  return {
    averageRating: Math.round(Number(summary.averageRating || 0) * 10) / 10,

    reviewCount: Number(summary.reviewCount || 0),
  };
}
