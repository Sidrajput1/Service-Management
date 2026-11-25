import ServiceProvider from "@/models/ServiceProvider";
import ServiceOffering from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";
import User from "@/models/user";
import type { IServiceRequest } from "@/models/ServiceRequest";
import { catalogCategories } from "./catalog/definition.mjs";
import { offeringEligibility } from "./moderation-policy.mjs";
import { coverageForRequest } from "./request-coverage";
import { createNotification } from "./notification";

type NewRequest = Pick<
  IServiceRequest,
  | "_id"
  | "serviceProviderId"
  | "serviceOfferingId"
  | "status"
  | "address"
  | "coverage"
>;
const activeCategories = catalogCategories
  .filter((category) => category.isActive)
  .map((category) => category.key);

export async function notifyNewServiceRequest(request: NewRequest) {
  if (
    request.status !== "open" ||
    request.coverage?.status !== "matched" ||
    request.coverage.requiresProviderConfirmation !== false
  )
    return;

  try {
    const [provider, offering] = await Promise.all([
      ServiceProvider.findById(request.serviceProviderId).lean(),
      ServiceOffering.findOne({
        _id: request.serviceOfferingId,
        serviceProviderId: request.serviceProviderId,
      }).lean(),
    ]);
    if (!provider || !offering || offering.pricingModel === "quote_required")
      return;
    const item = await PriceItem.findById(offering.priceItemId).lean();
    if (
      offeringEligibility(
        offering,
        provider,
        item,
        request.address,
        activeCategories,
      ) ||
      coverageForRequest(provider, request.address).status !== "matched"
    )
      return;
    const owner = await User.exists({
      _id: provider.ownerId,
      role: "service_provider",
      isActive: { $ne: false },
    });
    if (!owner) return;

    await createNotification({
      recipientUserId: String(owner._id),
      recipientRole: "service_provider",
      title: "New service request",
      message:
        "A customer chose one of your services. Open booking requests to review it.",
      type: "booking",
      entityType: "service_request",
      entityId: String(request._id),
      actionUrl: "/service-provider/booking-requests",
      dedupeKey: `service-request-created:${request._id}:${owner._id}`,
      pushEvent: "service_request_created",
    });
  } catch {
    console.error(
      "Service request saved. Provider notification could not be recorded.",
    );
  }
}
