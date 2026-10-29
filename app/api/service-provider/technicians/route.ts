import { requireProvider } from "@/lib/service-provider";
import { createProviderPro } from "@/lib/provider-technicians";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult } from "@/lib/pagination";
import { escapeRegex, normalizeText } from "@/lib/marketplace-policy.mjs";
import Technician from "@/models/technician";
import User from "@/models/user";
import mongoose from "mongoose";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { provider } = await requireProvider();
    const { cursor, limit } = readPage(request);
    const q = normalizeText(new URL(request.url).searchParams.get("q")).slice(
      0,
      100,
    );
    const filter = {
      serviceProviderId: provider._id,
      ...(cursor ? { _id: { $lt: new mongoose.Types.ObjectId(cursor) } } : {}),
    };
    const rows = await Technician.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: User.collection.name,
          localField: "userId",
          foreignField: "_id",
          as: "userId",
          pipeline: [
            ...(q
              ? [
                  {
                    $match: {
                      $or: ["name", "email", "phone"].map((field) => ({
                        [field]: { $regex: escapeRegex(q), $options: "i" },
                      })),
                    },
                  },
                ]
              : []),
            { $project: { name: 1, email: 1, phone: 1 } },
          ],
        },
      },
      { $unwind: "$userId" },
      { $sort: { _id: -1 } },
      { $limit: limit + 1 },
      {
        $project: {
          userId: 1,
          skills: 1,
          skillKeys: 1,
          vehicleType: 1,
          status: 1,
          isActive: 1,
          createdAt: 1,
        },
      },
    ]).option({ maxTimeMS: 5000 });
    const page = pageResult(rows, limit);
    return privateJson({
      success: true,
      technicians: page.items.filter((row) => row.userId),
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { provider } = await requireProvider();
    return privateJson(
      await createProviderPro(provider._id, await request.json()),
      201,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return privateJson(
        {
          error:
            "Account or request already exists. Refresh your team and use Reissue initial password if needed.",
        },
        409,
      );
    return apiFailure(error);
  }
}
