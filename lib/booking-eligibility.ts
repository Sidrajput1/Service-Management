import ServiceProvider from "@/models/ServiceProvider";
import ServiceOffering from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";
import { offeringEligibility } from "./moderation-policy.mjs";
import { catalogCategories } from "./catalog/definition.mjs";
import { ApiAuthError } from "./auth";
import type { ClientSession, Types } from "mongoose";
import { coverageForRequest } from "./request-coverage";
export async function confirmMarketplaceEligibility(
  providerId: Types.ObjectId,
  offeringId: Types.ObjectId,
  address: {
    addressLine?: string;
    state?: string;
    city?: string;
    locality?: string;
    pincode?: string;
  },
  session: ClientSession,
) {
  const provider = await ServiceProvider.findById(providerId)
    .session(session)
    .lean();
  const offering = await ServiceOffering.findOne({
    _id: offeringId,
    serviceProviderId: providerId,
  })
    .session(session)
    .lean();
  const item = offering
    ? await PriceItem.findById(offering.priceItemId).session(session).lean()
    : null;
  const issue = offeringEligibility(
    offering,
    provider,
    item,
    address,
    catalogCategories
      .filter((category) => category.isActive)
      .map((category) => category.key),
  );
  if (issue) throw new ApiAuthError(issue, 409);
  if (offering?.pricingModel === "quote_required")
    throw new ApiAuthError(
      "This service requires a quotation and cannot be accepted as a fixed-price booking online.",
      409,
    );
  // Serialize confirmation with concurrent suspension, listing decisions and catalog deactivation.
  // This changes only Mongoose's internal version counter, never review state or saved prices.
  await ServiceProvider.updateOne(
    { _id: providerId },
    { $inc: { __v: 1 } },
    { session },
  );
  await ServiceOffering.updateOne(
    { _id: offeringId },
    { $inc: { __v: 1 } },
    { session },
  );
  await PriceItem.updateOne(
    { _id: item!._id },
    { $inc: { __v: 1 } },
    { session },
  );
  return coverageForRequest(provider, address);
}
