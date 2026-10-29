import { requireCustomerProfile } from "@/lib/customer";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import Job from "@/models/job";
import Booking from "@/models/booking";
import "@/models/technician";
import "@/models/user";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { customer } = await requireCustomerProfile();
    const id = objectIdSchema.parse((await params).id);
    const reference = await Job.findById(id).select("bookingId").lean();
    if (!reference || !await Booking.exists({ _id: reference.bookingId, customerId: customer._id })) return privateJson({ error: "Job not found" }, 404);
    const job = await Job.findById(id).select("bookingId technicianId scheduledAt status paymentStatus startTime endTime acceptedAt arrivedAt customerOtpVerifiedAt createdAt updatedAt")
      .populate("bookingId", "serviceType scheduledAt address status")
      .populate({ path: "technicianId", select: "userId skills", populate: { path: "userId", select: "name phone" } }).lean();
    return privateJson({ job });
  } catch (error) { return apiFailure(error); }
}