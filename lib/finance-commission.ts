import { type ClientSession, type Types } from "mongoose";
import {
  CommissionPolicy,
  FinanceTermsAcceptance,
  FinanceEvent,
} from "@/models/finance";
import ServiceOffering from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";
import {
  selectCommissionPolicy,
  commissionBasis,
  financeTermsVersion,
} from "./finance-policy.mjs";
import type { CommissionSnapshot } from "@/models/finance-fields";
import { ApiAuthError } from "./auth";

export async function applicableCommission(
  providerId: Types.ObjectId,
  offeringId: Types.ObjectId,
  session?: ClientSession,
) {
  const offering = await ServiceOffering.findById(offeringId)
    .select("priceItemId")
    .session(session || null)
    .lean();
  const item = offering
    ? await PriceItem.findById(offering.priceItemId)
        .select("categoryKey")
        .session(session || null)
        .lean()
    : null;
  const policies = await CommissionPolicy.find({
    effectiveAt: { $lte: new Date() },
    $or: [
      { scope: "global" },
      { scope: "provider", scopeKey: String(providerId) },
      ...(item?.categoryKey
        ? [{ scope: "category", scopeKey: item.categoryKey }]
        : []),
    ],
  })
    .session(session || null)
    .lean();
  const policy = selectCommissionPolicy(
    policies,
    providerId,
    item?.categoryKey,
  );
  const acceptance = policy
    ? await FinanceTermsAcceptance.findOne({
        providerId,
        policyId: policy._id,
        termsVersion: policy.termsVersion,
      })
        .session(session || null)
        .lean()
    : null;
  return { policy, acceptance, categoryKey: item?.categoryKey };
}
export async function commissionForBooking(
  providerId: Types.ObjectId,
  offeringId: Types.ObjectId,
  session?: ClientSession,
): Promise<CommissionSnapshot> {
  const { policy, acceptance } = await applicableCommission(
    providerId,
    offeringId,
    session,
  );
  if (!policy) return { state: "missing_policy", establishedAt: new Date() };
  if (!acceptance)
    throw new ApiAuthError(
      "Review and accept the commission rule in Earnings & Payments before accepting new work.",
      409,
    );
  return {
    state: "ready",
    policyId: policy._id,
    rateBps: policy.rateBps,
    basis: commissionBasis,
    scope: policy.scope,
    scopeKey: policy.scopeKey,
    termsVersion: policy.termsVersion,
    acceptedAt: acceptance.acceptedAt,
    establishedAt: new Date(),
    collectionDays: policy.collectionDays,
  };
}
export async function acceptFinanceTerms(
  providerId: Types.ObjectId,
  actorId: Types.ObjectId,
  policyId: string,
  session: ClientSession,
) {
  const policy = await CommissionPolicy.findById(policyId).session(session);
  if (
    !policy ||
    (policy.scope === "provider" && policy.scopeKey !== String(providerId))
  )
    throw new ApiAuthError("Commission rule not found", 404);
  const acceptance = await FinanceTermsAcceptance.findOneAndUpdate(
    { providerId, policyId: policy._id },
    {
      $setOnInsert: {
        termsVersion: policy.termsVersion,
        acceptedBy: actorId,
        acceptedAt: new Date(),
      },
    },
    { upsert: true, new: true, session },
  );
  await FinanceEvent.updateOne(
    { dedupeKey: `terms:${providerId}:${policyId}` },
    {
      $setOnInsert: {
        kind: "terms_accepted",
        actorId,
        actorRole: "service_provider",
        providerId,
        resourceId: policy._id,
        details: {
          termsVersion: policy.termsVersion,
          rateBps: policy.rateBps,
          basis: policy.basis,
          effectiveAt: policy.effectiveAt,
        },
      },
    },
    { upsert: true, session },
  );
  return acceptance;
}
export { commissionBasis, financeTermsVersion };
