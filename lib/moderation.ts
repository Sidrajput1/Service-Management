import mongoose, { type ClientSession, type Types } from "mongoose";
import { createHash } from "node:crypto";
import { ApiAuthError } from "./auth";
import { connectToDb } from "./db";
import { onboardingProgress } from "./provider-onboarding";
import { offeringSchema, validateOffering } from "./marketplace-validation";
import { catalogCategories } from "./catalog/definition.mjs";
import {
  revisionOf,
  revisionFilter,
  providerTransition,
  offeringTransition,
} from "./moderation-policy.mjs";
import { deliverModerationNotification } from "./moderation-notifications";
import ModerationAudit, {
  type IModerationAudit,
} from "@/models/ModerationAudit";
import ServiceProvider from "@/models/ServiceProvider";
import ServiceOffering from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";
import User from "@/models/user";
import type {
  ProviderDecisionInput,
  OfferingDecisionInput,
} from "./admin-validation";

export interface ReviewActor {
  id: string;
  kind: "admin" | "service_provider";
}
interface AuditRequest {
  actor: ReviewActor;
  requestId: string;
  expectedVersion?: number;
  targetType: "provider" | "offering" | "catalog";
  targetId: string;
  action: string;
  reason?: string;
  payload?: unknown;
}
interface AuditChange {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  recipientId?: Types.ObjectId;
}
export async function auditedChange(
  input: AuditRequest,
  change: (session: ClientSession) => Promise<AuditChange>,
) {
  await connectToDb();
  const actorKey = `${input.actor.kind}:${input.actor.id}`;
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        targetType: input.targetType,
        targetId: input.targetId,
        action: input.action,
        reason: input.reason || "",
        expectedVersion: input.expectedVersion,
        payload: input.payload,
      }),
    )
    .digest("hex");
  const key = { actorKey, requestId: input.requestId };
  const reuse = (audit: IModerationAudit) => {
    if (audit.requestHash !== requestHash)
      throw new ApiAuthError(
        "This request ID was already used for a different decision.",
        409,
      );
    return audit;
  };
  let audit: IModerationAudit | null | undefined =
    await ModerationAudit.findOne(key).lean();
  let replayed = Boolean(audit);
  if (audit) reuse(audit);
  else {
    const session = await mongoose.startSession();
    try {
      audit = await session.withTransaction(async () => {
        const previous = await ModerationAudit.findOne(key)
          .session(session)
          .lean();
        if (previous) {
          replayed = true;
          return reuse(previous);
        }
        const result = await change(session);
        const [created] = await ModerationAudit.create(
          [
            {
              ...key,
              actorId: new mongoose.Types.ObjectId(input.actor.id),
              actorKind: input.actor.kind,
              requestHash,
              targetType: input.targetType,
              targetId: new mongoose.Types.ObjectId(input.targetId),
              action: input.action,
              reason: input.reason || "",
              before: result.before,
              after: result.after,
              notificationRecipientId: result.recipientId,
              notificationState: result.recipientId ? "pending" : "none",
            },
          ],
          { session },
        );
        return created.toObject();
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        const committed = await ModerationAudit.findOne(key).lean();
        if (committed) {
          audit = reuse(committed);
          replayed = true;
        } else
          throw new ApiAuthError(
            "A record with this identity already exists. Refresh before retrying.",
            409,
          );
      } else throw error;
    } finally {
      await session.endSession();
    }
  }
  if (!audit) throw new Error("Decision transaction did not complete");
  const notificationPending = await deliverModerationNotification(audit);
  return {
    success: true,
    replayed,
    targetId: input.targetId,
    result: audit.after,
    notificationPending,
  };
}
export async function decideProvider(
  actorId: string,
  id: string,
  value: ProviderDecisionInput,
) {
  return auditedChange(
    {
      actor: { id: actorId, kind: "admin" },
      targetId: id,
      targetType: "provider",
      ...value,
    },
    async (session) => {
      const provider = await ServiceProvider.findById(id).session(session);
      if (!provider) throw new ApiAuthError("Provider not found", 404);
      const version = revisionOf(provider);
      if (version !== value.expectedVersion)
        throw new ApiAuthError(
          "This application changed. Refresh and review the latest information.",
          409,
        );
      const next = providerTransition(provider, value.action);
      if (!next)
        throw new ApiAuthError(
          "This decision is not valid for the current business status.",
          409,
        );
      if (value.action === "approve") {
        const progress = await onboardingProgress(provider, session);
        if (
          !provider.onboardingCompletedAt ||
          Object.values(progress).some((done) => !done)
        )
          throw new ApiAuthError(
            "The business must finish its saved onboarding requirements before approval.",
            400,
          );
        if (
          !(await User.exists({
            _id: provider.ownerId,
            role: "service_provider",
            isActive: { $ne: false },
          }).session(session))
        )
          throw new ApiAuthError(
            "The linked business owner account is unavailable.",
            400,
          );
      }
      const before = {
        verificationStatus: provider.verificationStatus,
        status: provider.status,
        reviewVersion: version,
      };
      const after = { ...next, reviewVersion: version + 1 };
      const updated = await ServiceProvider.findOneAndUpdate(
        { _id: id, ...revisionFilter(version) },
        {
          $set: {
            ...next,
            lastReview: {
              action: value.action,
              reason: value.reason,
              actorId,
              decidedAt: new Date(),
            },
          },
          $inc: { reviewVersion: 1 },
        },
        { new: true, session },
      );
      if (!updated)
        throw new ApiAuthError(
          "Another review changed this application. Refresh before deciding.",
          409,
        );
      return { before, after, recipientId: provider.ownerId };
    },
  );
}
export async function decideOffering(
  actorId: string,
  id: string,
  value: OfferingDecisionInput,
) {
  return auditedChange(
    {
      actor: { id: actorId, kind: "admin" },
      targetId: id,
      targetType: "offering",
      ...value,
    },
    async (session) => {
      const offering = await ServiceOffering.findById(id).session(session);
      if (!offering) throw new ApiAuthError("Service offering not found", 404);
      const version = revisionOf(offering);
      if (version !== value.expectedVersion)
        throw new ApiAuthError(
          "This offering changed. Refresh and review its latest scope and price.",
          409,
        );
      const next = offeringTransition(offering, value.action);
      if (!next)
        throw new ApiAuthError(
          "This decision is not valid for the current offering status.",
          409,
        );
      const provider = await ServiceProvider.findById(
        offering.serviceProviderId,
      )
        .select("ownerId")
        .session(session);
      if (!provider)
        throw new ApiAuthError("The linked provider is unavailable.", 400);
      if (value.action === "approve") {
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
            "The linked catalog service/category is inactive. Ask for changes before approval.",
            400,
          );
      }
      const before = {
        approvalStatus: offering.approvalStatus || "pending",
        reviewVersion: version,
      };
      const after = { ...next, reviewVersion: version + 1 };
      const updated = await ServiceOffering.findOneAndUpdate(
        { _id: id, ...revisionFilter(version) },
        {
          $set: {
            ...next,
            lastReview: {
              action: value.action,
              reason: value.reason,
              actorId,
              decidedAt: new Date(),
            },
          },
          $inc: { reviewVersion: 1 },
        },
        { new: true, session },
      );
      if (!updated)
        throw new ApiAuthError(
          "Another review changed this offering. Refresh before deciding.",
          409,
        );
      return { before, after, recipientId: provider.ownerId };
    },
  );
}
