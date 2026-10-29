import {
  offeringScopeChanged,
  revisionOf,
  revisionFilter,
} from "@/lib/moderation-policy.mjs";
import PriceItem from "@/models/PriceItem";
import ServiceOffering from "@/models/ServiceOffering";
import ServiceProvider from "@/models/ServiceProvider";
import { ApiAuthError } from "@/lib/auth";
import { offeringSchema, validateOffering } from "@/lib/marketplace-validation";
import { catalogCategories } from "@/lib/catalog/definition.mjs";
import type { ClientSession, Types } from "mongoose";
export async function saveProviderOffering(
  providerId: Types.ObjectId,
  input: unknown,
  options: { id?: string; session?: ClientSession; onboarding?: boolean } = {},
) {
  const value = validateOffering(offeringSchema.parse(input));
  const item = await PriceItem.findOne({
    _id: value.priceItemId,
    itemType: "service",
    isActive: true,
  })
    .session(options.session || null)
    .lean();
  if (
    !item ||
    (item.categoryKey &&
      item.categoryKey !== "other" &&
      !catalogCategories.some(
        (category) => category.key === item.categoryKey && category.isActive,
      ))
  )
    throw new ApiAuthError("Select an active catalog service", 400);
  const existing = await ServiceOffering.findOne({
    serviceProviderId: providerId,
    ...(options.id ? { _id: options.id } : { priceItemId: item._id }),
  }).session(options.session || null);
  if (options.id && !existing)
    throw new ApiAuthError("Service offering not found", 404);
  if (existing && String(existing.priceItemId) !== String(item._id))
    throw new ApiAuthError(
      "An existing offering cannot change its catalog identity",
      400,
    );
  if (existing?.isActive && !options.id && !options.onboarding)
    throw new ApiAuthError(
      "You already offer this service. Edit it instead.",
      409,
    );
  const changes = {
    ...value,
    name: item.name,
    priceItemId: item._id,
    offerStartsAt: value.offerStartsAt
      ? new Date(value.offerStartsAt)
      : undefined,
    offerEndsAt: value.offerEndsAt ? new Date(value.offerEndsAt) : undefined,
  };
  let offering;
  if (existing) {
    const version = revisionOf(existing);
    const needsReview =
      existing.approvalStatus === "approved" &&
      offeringScopeChanged(existing, changes);
    const set = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    const unset = Object.fromEntries(
      ["offerStartsAt", "offerEndsAt", "discountType"]
        .filter((key) => changes[key as keyof typeof changes] === undefined)
        .map((key) => [key, 1]),
    );
    offering = await ServiceOffering.findOneAndUpdate(
      {
        _id: existing._id,
        serviceProviderId: providerId,
        ...revisionFilter(version),
      },
      {
        $set: {
          ...set,
          ...(needsReview
            ? { approvalStatus: "pending", reviewSubmittedAt: new Date() }
            : {}),
        },
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
        $inc: { reviewVersion: 1 },
      },
      { new: true, session: options.session, runValidators: true },
    );
    if (!offering)
      throw new ApiAuthError(
        "This offering changed while you were editing. Refresh and retry.",
        409,
      );
  } else
    [offering] = await ServiceOffering.create(
      [
        {
          ...changes,
          serviceProviderId: providerId,
          approvalStatus: "pending",
          reviewVersion: 1,
          reviewSubmittedAt: new Date(),
        },
      ],
      { session: options.session },
    );
  await ServiceProvider.updateOne(
    { _id: providerId },
    { $addToSet: { services: item._id } },
    { session: options.session },
  );
  return offering;
}
