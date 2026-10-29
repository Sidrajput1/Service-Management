import mongoose from "mongoose";
import Review from "@/models/Review";
import ServiceProvider from "@/models/ServiceProvider";
import { confidenceRating } from "@/lib/marketplace-policy.mjs";
export async function refreshProviderRating(providerId: string) {
  const startedAt = new Date();
  const [summary] = await Review.aggregate<{ average: number; count: number }>([
    {
      $match: {
        serviceProviderId: new mongoose.Types.ObjectId(providerId),
        status: "published",
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$providerRating" },
        count: { $sum: 1 },
      },
    },
  ]);
  const average = summary?.average || 0,
    count = summary?.count || 0;
  await ServiceProvider.updateOne(
    {
      _id: providerId,
      $or: [
        { "ratingSummary.updatedAt": { $exists: false } },
        { "ratingSummary.updatedAt": { $lte: startedAt } },
      ],
    },
    {
      $set: {
        ratingSummary: {
          average,
          count,
          score: confidenceRating(average, count),
          updatedAt: startedAt,
        },
      },
    },
  );
}
