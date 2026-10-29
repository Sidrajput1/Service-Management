import Booking from "@/models/booking";
import Job from "@/models/job";
import ServiceOffering from "@/models/ServiceOffering";
import ServiceProvider from "@/models/ServiceProvider";
import PriceItem from "@/models/PriceItem";
import { requireCustomerProfile } from "@/lib/customer";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
import { offeringEligibility } from "@/lib/moderation-policy.mjs";
import { catalogCategories } from "@/lib/catalog/definition.mjs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { customer } = await requireCustomerProfile(),
      id = objectIdSchema.parse((await params).id),
      booking = await Booking.findOne({
        _id: id,
        customerId: customer._id,
      }).lean();
    if (
      !booking ||
      !(await Job.exists({
        bookingId: booking._id,
        serviceProviderId: booking.serviceProviderId,
        status: "completed",
      }))
    )
      return privateJson(
        { error: "A completed booking from your account is required." },
        404,
      );
    const offering = await ServiceOffering.findById(
        booking.serviceOfferingId,
      ).lean(),
      provider = await ServiceProvider.findById(
        booking.serviceProviderId,
      ).lean(),
      item = offering
        ? await PriceItem.findById(offering.priceItemId).lean()
        : null;
    const error = offeringEligibility(
      offering,
      provider,
      item,
      booking.address,
      catalogCategories.filter((row) => row.isActive).map((row) => row.key),
    );
    if (
      error ||
      !offering ||
      !item ||
      offering.pricingModel === "quote_required"
    )
      return privateJson(
        {
          error:
            error ||
            "This service needs a new quote. Explore current services.",
        },
        409,
      );
    return privateJson({
      destination: `/customer/services?${new URLSearchParams({ serviceId: String(item._id), offeringId: String(offering._id), repeatBookingId: id })}`,
      message:
        "Review the current price, service address and booking details before sending a new request. Previous payments and invoices are not reused.",
    });
  } catch (error) {
    return apiFailure(error);
  }
}
