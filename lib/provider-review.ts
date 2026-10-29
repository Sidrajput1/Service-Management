import { type ClientSession } from "mongoose";
import ServiceProvider, {
  type IServiceProvider,
} from "@/models/ServiceProvider";
import ServiceOffering from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";
import { ApiAuthError } from "./auth";
import { auditedChange } from "./moderation";
import { onboardingProgress } from "./provider-onboarding";
import {
  revisionFilter,
  revisionOf,
  providerIdentityChanged,
} from "./moderation-policy.mjs";
import { validateOffering, offeringSchema } from "./marketplace-validation";
import { catalogCategories } from "./catalog/definition.mjs";
import type { z } from "zod";
import type { resubmitSchema } from "./admin-validation";

/** Every public-profile edit advances the review revision; identity edits require a fresh review. */
export async function saveProviderProfile(
  provider: IServiceProvider,
  changes: Record<string, unknown>,
  identityChange?: boolean,
  session?: ClientSession,
) {
  const needsReview =
    identityChange ?? providerIdentityChanged(provider, changes);
  const version = revisionOf(provider);
  const updated = await ServiceProvider.findOneAndUpdate(
    {
      _id: provider._id,
      ownerId: provider.ownerId,
      ...revisionFilter(version),
    },
    {
      $set: {
        ...changes,
        ...(needsReview && provider.verificationStatus === "verified"
          ? { verificationStatus: "pending", reviewSubmittedAt: new Date() }
          : {}),
      },
      $inc: { reviewVersion: 1 },
    },
    { new: true, runValidators: true, session },
  );
  if (!updated)
    throw new ApiAuthError(
      "Your business profile changed. Refresh and retry.",
      409,
    );
  return updated;
}
export async function resubmitProvider(
  ownerId: string,
  providerId: string,
  input: z.infer<typeof resubmitSchema>,
) {
  return auditedChange(
    {
      actor: { id: ownerId, kind: "service_provider" },
      targetType: "provider",
      targetId: providerId,
      action: "resubmit",
      ...input,
    },
    async (session) => {
      const provider = await ServiceProvider.findOne({
        _id: providerId,
        ownerId,
      }).session(session);
      if (!provider) throw new ApiAuthError("Provider not found", 404);
      const version = revisionOf(provider);
      if (
        version !== input.expectedVersion ||
        !["rejected", "changes_requested"].includes(provider.verificationStatus)
      )
        throw new ApiAuthError(
          "This application changed or is already in review. Refresh before resubmitting.",
          409,
        );
      const progress = await onboardingProgress(provider, session);
      if (
        !provider.onboardingCompletedAt ||
        Object.values(progress).some((done) => !done)
      )
        throw new ApiAuthError(
          "Complete the saved onboarding requirements before resubmitting.",
          400,
        );
      const updated = await ServiceProvider.findOneAndUpdate(
        { _id: providerId, ownerId, ...revisionFilter(version) },
        {
          $set: {
            verificationStatus: "pending",
            reviewSubmittedAt: new Date(),
          },
          $inc: { reviewVersion: 1 },
        },
        { new: true, session },
      );
      if (!updated)
        throw new ApiAuthError("Application changed. Refresh and retry.", 409);
      return {
        before: {
          verificationStatus: provider.verificationStatus,
          reviewVersion: version,
        },
        after: {
          verificationStatus: "pending",
          status: provider.status,
          reviewVersion: version + 1,
        },
      };
    },
  );
}
export async function resubmitOffering(
  ownerId: string,
  providerId: string,
  id: string,
  input: z.infer<typeof resubmitSchema>,
) {
  return auditedChange(
    {
      actor: { id: ownerId, kind: "service_provider" },
      targetType: "offering",
      targetId: id,
      action: "resubmit",
      ...input,
    },
    async (session) => {
      const offering = await ServiceOffering.findOne({
        _id: id,
        serviceProviderId: providerId,
      }).session(session);
      if (!offering) throw new ApiAuthError("Offering not found", 404);
      const version = revisionOf(offering);
      if (
        version !== input.expectedVersion ||
        !["rejected", "changes_requested"].includes(
          offering.approvalStatus || "pending",
        )
      )
        throw new ApiAuthError(
          "This offering changed or is already in review. Refresh before resubmitting.",
          409,
        );
      validateOffering(
        offeringSchema.parse({
          ...offering.toObject(),
          priceItemId: String(offering.priceItemId),
          offerStartsAt: offering.offerStartsAt?.toISOString(),
          offerEndsAt: offering.offerEndsAt?.toISOString(),
        }),
      );
      const item = await PriceItem.findOne({
        _id: offering.priceItemId,
        itemType: "service",
        isActive: true,
      })
        .session(session)
        .lean();
      if (
        !item ||
        (item.categoryKey &&
          item.categoryKey !== "other" &&
          !catalogCategories.some(
            (category) =>
              category.key === item.categoryKey && category.isActive,
          ))
      )
        throw new ApiAuthError(
          "The catalog service/category must be active before resubmission.",
          400,
        );
      const updated = await ServiceOffering.findOneAndUpdate(
        { _id: id, serviceProviderId: providerId, ...revisionFilter(version) },
        {
          $set: { approvalStatus: "pending", reviewSubmittedAt: new Date() },
          $inc: { reviewVersion: 1 },
        },
        { new: true, session },
      );
      if (!updated)
        throw new ApiAuthError("Offering changed. Refresh and retry.", 409);
      return {
        before: {
          approvalStatus: offering.approvalStatus,
          reviewVersion: version,
        },
        after: { approvalStatus: "pending", reviewVersion: version + 1 },
      };
    },
  );
}
