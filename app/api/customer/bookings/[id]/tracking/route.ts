import { requireCustomerProfile } from "@/lib/customer";
import { activeJobStatus } from "@/lib/access-policy.mjs";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import Booking from "@/models/booking";
import Job from "@/models/job";
/** Compatibility endpoint: this release communicates arrival status, not a Pro GPS stream. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { customer } = await requireCustomerProfile();
    const id = objectIdSchema.parse((await params).id);
    const booking = await Booking.findOne({ _id: id, customerId: customer._id })
      .select("status serviceProviderId")
      .lean();
    if (!booking) return privateJson({ error: "Booking not found" }, 404);
    const job = await Job.findOne({
      bookingId: id,
      serviceProviderId: booking.serviceProviderId,
    })
      .select("status")
      .lean();
    return privateJson({
      state:
        booking.status === "cancelled" || !job || !activeJobStatus(job.status)
          ? "inactive"
          : "unavailable",
      lastUpdated: null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
