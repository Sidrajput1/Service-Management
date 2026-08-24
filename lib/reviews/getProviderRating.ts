import Review from "@/models/Review";
import mongoose from "mongoose";

export async function getProviderRatingSummary(
  serviceProviderId: string,
) {
  const result =
    await Review.aggregate([
      {
        $match: {
          serviceProviderId:
            new mongoose.Types.ObjectId(
              serviceProviderId,
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
              "$providerRating",
          },

          totalReviews: {
            $sum: 1,
          },

          fiveStar: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$providerRating",
                    5,
                  ],
                },
                1,
                0,
              ],
            },
          },

          fourStar: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$providerRating",
                    4,
                  ],
                },
                1,
                0,
              ],
            },
          },

          threeStar: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$providerRating",
                    3,
                  ],
                },
                1,
                0,
              ],
            },
          },

          twoStar: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$providerRating",
                    2,
                  ],
                },
                1,
                0,
              ],
            },
          },

          oneStar: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$providerRating",
                    1,
                  ],
                },
                1,
                0,
              ],
            },
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
      distribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
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

    distribution: {
      5: summary.fiveStar,
      4: summary.fourStar,
      3: summary.threeStar,
      2: summary.twoStar,
      1: summary.oneStar,
    },
  };
}