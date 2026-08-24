import mongoose from "mongoose";
import Review from "@/models/Review";

export async function getTechnicianRatingSummary(
  technicianId: string,
) {
  const result =
    await Review.aggregate([
      {
        $match: {
          technicianId:
            new mongoose.Types.ObjectId(
              technicianId,
            ),

          status:
            "published",
        },
      },

      {
        $group: {
          _id: null,

          averageRating: {
            $avg:
              "$technicianRating",
          },

          totalReviews: {
            $sum: 1,
          },
        },
      },
    ]);

  const summary =
    result[0];

  if (!summary) {
    return {
      averageRating: 0,
      totalReviews: 0,
    };
  }

  return {
    averageRating:
      Math.round(
        Number(
          summary.averageRating ||
            0,
        ) * 10,
      ) / 10,

    totalReviews:
      summary.totalReviews,
  };
}