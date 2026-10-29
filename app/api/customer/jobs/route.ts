import { requireCustomerProfile } from "@/lib/customer";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult } from "@/lib/pagination";
import Booking from "@/models/booking";
import Job from "@/models/job";
import "@/models/technician";
import "@/models/user";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { customer } = await requireCustomerProfile();
    const { cursor, limit } = readPage(request);
    const bookingIds = await Booking.find({ customerId: customer._id }).distinct("_id");
    const rows = await Job.find({ bookingId: { $in: bookingIds }, ...(cursor ? { _id: { $lt: cursor } } : {}) }).select("bookingId technicianId status scheduledAt paymentStatus updatedAt createdAt")
      .populate("bookingId", "serviceType scheduledAt status")
      .populate({ path: "technicianId", select: "userId skills", populate: { path: "userId", select: "name" } }).sort({ _id: -1 }).limit(limit + 1).lean();
    const page = pageResult(rows, limit);
    return privateJson({ jobs: page.items, nextCursor: page.nextCursor });
  } catch (error) { return apiFailure(error); }
}