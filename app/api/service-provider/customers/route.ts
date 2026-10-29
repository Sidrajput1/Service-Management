import mongoose from "mongoose";
import { requireProvider } from "@/lib/service-provider";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult } from "@/lib/pagination";
import Booking from "@/models/booking";
import Customer from "@/models/customer";
export async function GET(request: Request) {
  try {
    const { provider } = await requireProvider();
    const { cursor, limit } = readPage(request);
    const rows = await Booking.aggregate([
      {
        $match: {
          serviceProviderId: provider._id,
          ...(cursor
            ? { customerId: { $lt: new mongoose.Types.ObjectId(cursor) } }
            : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$customerId",
          bookingCount: { $sum: 1 },
          lastBookingId: { $first: "$_id" },
          lastBookedAt: { $first: "$createdAt" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: limit + 1 },
      {
        $lookup: {
          from: Customer.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "customer",
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    ]).option({ maxTimeMS: 5000 });
    const page = pageResult(rows, limit);
    return privateJson({ customers: page.items, nextCursor: page.nextCursor });
  } catch (error) {
    return apiFailure(error);
  }
}
