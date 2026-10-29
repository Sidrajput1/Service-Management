import mongoose, { type PipelineStage } from "mongoose";
import { requireCustomerProfile } from "@/lib/customer";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult } from "@/lib/pagination";
import Booking from "@/models/booking";
import Job from "@/models/job";
import ServiceProvider from "@/models/ServiceProvider";
import ServiceOffering from "@/models/ServiceOffering";
import type { BookingSummary } from "@/lib/customer-types";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { customer } = await requireCustomerProfile();
    const { cursor, limit } = readPage(request);
    const status = new URL(request.url).searchParams.get("status") || "all";
    const rows: PipelineStage.FacetPipelineStage[] = [];
    if (["upcoming", "active", "completed", "cancelled", "pending"].includes(status)) rows.push({ $match: { customerStatus: status } });
    else if (["confirmed", "assigned", "rescheduled"].includes(status)) rows.push({ $match: { status } });
    if (cursor) rows.push({ $match: { _id: { $lt: new mongoose.Types.ObjectId(cursor) } } });
    rows.push({ $sort: { _id: -1 } }, { $limit: limit + 1 },
      { $lookup: { from: ServiceProvider.collection.name, localField: "serviceProviderId", foreignField: "_id", as: "provider", pipeline: [{ $project: { companyName: 1, businessType: 1 } }] } },
      { $lookup: { from: ServiceOffering.collection.name, localField: "serviceOfferingId", foreignField: "_id", as: "serviceOffering", pipeline: [{ $project: { name: 1, description: 1, price: 1, taxPercent: 1 } }] } },
      { $set: { provider: { $arrayElemAt: ["$provider", 0] }, serviceOffering: { $arrayElemAt: ["$serviceOffering", 0] } } });
    const [result] = await Booking.aggregate<{ rows: BookingSummary[]; counts: { _id: string; count: number }[] }>([
      { $match: { customerId: customer._id } },
      { $lookup: { from: Job.collection.name, let: { booking: "$_id", provider: "$serviceProviderId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$bookingId", "$$booking"] }, { $eq: ["$serviceProviderId", "$$provider"] }] } } }, { $project: { status: 1, technicianId: 1, scheduledAt: 1, updatedAt: 1, invoiceId: 1, paymentStatus: 1 } }, { $limit: 1 }], as: "job" } },
      { $set: { job: { $arrayElemAt: ["$job", 0] } } },
      { $set: { customerStatus: { $switch: { branches: [
        { case: { $eq: ["$status", "cancelled"] }, then: "cancelled" },
        { case: { $eq: ["$job.status", "cancelled"] }, then: "cancelled" },
        { case: { $eq: ["$job.status", "completed"] }, then: "completed" },
        { case: { $in: ["$job.status", ["assigned", "enroute", "arrived", "otp_verified", "in_progress", "on_hold"]] }, then: "active" },
        { case: { $eq: ["$status", "assigned"] }, then: "active" },
        { case: { $in: ["$status", ["confirmed", "rescheduled"]] }, then: "upcoming" },
      ], default: "pending" } } } },
      { $project: { serviceType: 1, scheduledAt: 1, address: 1, pricing: 1, estimatedPrice: 1, status: 1, serviceProviderId: 1, serviceOfferingId: 1, customerStatus: 1, job: 1, createdAt: 1, updatedAt: 1 } },
      { $facet: { rows, counts: [{ $group: { _id: "$customerStatus", count: { $sum: 1 } } }] } },
    ]);
    const counts: Record<string, number> = { all: 0, upcoming: 0, active: 0, completed: 0, cancelled: 0, pending: 0 };
    for (const entry of result.counts) { counts[entry._id] = entry.count; counts.all += entry.count; }
    const page = pageResult(result.rows, limit);
    return privateJson({ success: true, bookings: page.items, counts, nextCursor: page.nextCursor });
  } catch (error) { return apiFailure(error); }
}
