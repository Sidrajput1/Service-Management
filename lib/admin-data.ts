import "server-only";
import mongoose from "mongoose";
import { requireAdmin, ApiAuthError } from "./auth";
import { adminListSchema, type AdminListInput } from "./admin-validation";
import { escapeRegex, legacyCoverage } from "./marketplace-policy.mjs";
import { revisionOf } from "./moderation-policy.mjs";
import { onboardingProgress } from "./provider-onboarding";
import {
  catalogCategories,
  catalogSkills,
  pricingUnits,
} from "./catalog/definition.mjs";
import ServiceProvider, {
  type IServiceProvider,
} from "@/models/ServiceProvider";
import ServiceOffering, {
  type IServiceOffering,
} from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";
import ModerationAudit from "@/models/ModerationAudit";
import type {
  AdminPage,
  AdminProviderRow,
  AdminOfferingRow,
  AdminCatalogRow,
  ReviewSummary,
} from "./admin-types";

export function parseAdminList(value: Record<string, unknown>) {
  return adminListSchema.parse(value);
}
const timestamp = (value?: Date | null) =>
  value ? new Date(value).toISOString() : undefined;
function reviewSummary(
  review?: IServiceProvider["lastReview"],
): ReviewSummary | undefined {
  return review
    ? {
        action: review.action,
        reason: review.reason,
        actorId: review.actorId ? String(review.actorId) : undefined,
        decidedAt: timestamp(review.decidedAt),
      }
    : undefined;
}
export function adminCursorFilter(input: AdminListInput) {
  return input.cursor
    ? {
        _id: {
          [input.direction === "previous" ? "$gt" : "$lt"]:
            new mongoose.Types.ObjectId(input.cursor),
        },
      }
    : {};
}
export function adminPage<T extends { _id: unknown }>(
  rows: T[],
  input: AdminListInput,
): AdminPage<T> {
  const more = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  if (input.direction === "previous") items.reverse();
  const first = items[0],
    last = items.at(-1);
  return {
    items,
    previousCursor:
      input.direction === "previous"
        ? more && first
          ? String(first._id)
          : null
        : input.cursor
          ? first
            ? String(first._id)
            : input.cursor
          : null,
    nextCursor:
      input.direction === "previous"
        ? last
          ? String(last._id)
          : input.cursor || null
        : more && last
          ? String(last._id)
          : null,
  };
}
function providerRow(row: IServiceProvider): AdminProviderRow {
  return {
    _id: String(row._id),
    companyName: row.companyName,
    businessType: row.businessType,
    email: row.email,
    phone: row.phone,
    verificationStatus: row.verificationStatus || "pending",
    status: row.status,
    reviewVersion: revisionOf(row),
    onboardingCompletedAt: timestamp(row.onboardingCompletedAt),
    reviewSubmittedAt: timestamp(row.reviewSubmittedAt),
    createdAt: timestamp(row.createdAt) || "",
  };
}
async function auditHistory(targetType: string, targetId: string) {
  const rows = await ModerationAudit.find({ targetType, targetId })
    .select(
      "action actorId actorKind reason before after createdAt notificationState",
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(12)
    .maxTimeMS(5000)
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    action: row.action,
    actorId: row.actorId ? String(row.actorId) : undefined,
    actorKind: row.actorKind,
    reason: row.reason,
    before: row.before,
    after: row.after,
    createdAt: timestamp(row.createdAt) || "",
    notificationState: row.notificationState,
  }));
}
export async function readProviders(raw: Record<string, unknown>) {
  await requireAdmin();
  const input = parseAdminList(raw);
  if (
    ![
      "all",
      "pending",
      "changes_requested",
      "verified",
      "rejected",
      "suspended",
      "",
    ].includes(input.status)
  )
    throw new ApiAuthError("Choose a valid verification filter.", 400);
  const filter = {
    ...adminCursorFilter(input),
    ...(input.status === "suspended"
      ? { status: "suspended" }
      : input.status === "pending"
        ? { verificationStatus: { $in: ["pending", null] } }
        : input.status && input.status !== "all"
          ? { verificationStatus: input.status }
          : {}),
    ...(input.includeDrafts === "false"
      ? { onboardingCompletedAt: { $type: "date" as const } }
      : {}),
    ...(input.q
      ? { companyName: { $regex: escapeRegex(input.q), $options: "i" } }
      : {}),
  };
  const rows = await ServiceProvider.find(filter)
    .select(
      "companyName businessType email phone verificationStatus status reviewVersion onboardingCompletedAt reviewSubmittedAt createdAt",
    )
    .sort({ _id: input.direction === "previous" ? 1 : -1 })
    .limit(input.limit + 1)
    .maxTimeMS(5000)
    .lean();
  const page = adminPage(rows, input);
  return { ...page, items: page.items.map(providerRow), filters: input };
}
interface OfferingRow
  extends Omit<IServiceOffering, "serviceProviderId" | "priceItemId"> {
  serviceProviderId: mongoose.Types.ObjectId;
  priceItemId: mongoose.Types.ObjectId;
  provider?: {
    companyName?: string;
    verificationStatus?: string;
    status?: string;
    businessImage?: IServiceProvider["businessImage"];
  };
  catalog?: {
    name?: string;
    isActive?: boolean;
    categoryKey?: string;
    description?: string;
  };
}
function offeringRow(row: OfferingRow): AdminOfferingRow {
  return {
    _id: String(row._id),
    name: row.name,
    providerId: String(row.serviceProviderId),
    providerName: row.provider?.companyName || "Provider unavailable",
    providerVerificationStatus:
      row.provider?.verificationStatus || "unavailable",
    providerStatus: row.provider?.status || "unavailable",
    catalogId: String(row.priceItemId),
    catalogName: row.catalog?.name || "Catalog item unavailable",
    catalogActive: row.catalog?.isActive === true,
    approvalStatus: row.approvalStatus || "pending",
    reviewVersion: revisionOf(row),
    isActive: row.isActive,
    price: row.price,
    currency: row.currency || "INR",
    unit: row.unit || "job",
    pricingModel: row.pricingModel || "fixed",
    description: row.description,
    taxPercent: row.taxPercent,
    offerEnabled: row.offerEnabled,
    offerName: row.offerName,
    discountType: row.discountType,
    discountValue: row.discountValue,
    createdAt: timestamp(row.createdAt) || "",
    reviewSubmittedAt: timestamp(row.reviewSubmittedAt),
    lastReview: reviewSummary(row.lastReview),
  };
}
const offeringJoins: mongoose.PipelineStage[] = [
  {
    $lookup: {
      from: ServiceProvider.collection.name,
      localField: "serviceProviderId",
      foreignField: "_id",
      as: "provider",
      pipeline: [
        {
          $project: {
            companyName: 1,
            verificationStatus: 1,
            status: 1,
            businessImage: 1,
          },
        },
      ],
    },
  },
  { $unwind: { path: "$provider", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: PriceItem.collection.name,
      localField: "priceItemId",
      foreignField: "_id",
      as: "catalog",
      pipeline: [
        { $project: { name: 1, isActive: 1, categoryKey: 1, description: 1 } },
      ],
    },
  },
  { $unwind: { path: "$catalog", preserveNullAndEmptyArrays: true } },
];
export async function readOfferings(raw: Record<string, unknown>) {
  await requireAdmin();
  const input = parseAdminList(raw);
  if (
    ![
      "all",
      "pending",
      "approved",
      "changes_requested",
      "rejected",
      "",
    ].includes(input.status)
  )
    throw new ApiAuthError("Choose a valid offering approval filter.", 400);
  let providerFilter: Record<string, unknown> = input.providerId
    ? { serviceProviderId: new mongoose.Types.ObjectId(input.providerId) }
    : {};
  if (input.providerName && !input.providerId) {
    const providers = await ServiceProvider.find({
      companyName: { $regex: escapeRegex(input.providerName), $options: "i" },
    })
      .select("_id")
      .limit(51)
      .maxTimeMS(5000)
      .lean();
    if (providers.length > 50)
      throw new ApiAuthError(
        "More than 50 businesses match. Use a more specific business name.",
        400,
      );
    providerFilter = {
      serviceProviderId: { $in: providers.map((provider) => provider._id) },
    };
  }
  const match = {
    ...adminCursorFilter(input),
    ...providerFilter,
    ...(input.status === "pending"
      ? { approvalStatus: { $in: ["pending", null] } }
      : input.status && input.status !== "all"
        ? { approvalStatus: input.status }
        : {}),
    ...(input.q
      ? { name: { $regex: escapeRegex(input.q), $options: "i" } }
      : {}),
  };
  const rows = await ServiceOffering.aggregate<OfferingRow>([
    { $match: match },
    { $sort: { _id: input.direction === "previous" ? 1 : -1 } },
    { $limit: input.limit + 1 },
    ...offeringJoins,
  ]).option({ maxTimeMS: 5000 });
  const page = adminPage(rows, input);
  return { ...page, items: page.items.map(offeringRow), filters: input };
}
export async function readProvider(id: string) {
  await requireAdmin();
  const provider = await ServiceProvider.findById(id)
    .select(
      "companyName businessType description email phone address coverageVersion coverageAreas serviceAreas businessImage verificationStatus status reviewVersion reviewSubmittedAt lastReview onboardingCompletedAt createdAt",
    )
    .lean();
  if (!provider) throw new ApiAuthError("Provider not found", 404);
  const progress = await onboardingProgress(provider);
  const rows = await ServiceOffering.aggregate<OfferingRow>([
    { $match: { serviceProviderId: provider._id } },
    { $sort: { _id: -1 } },
    { $limit: 8 },
    ...offeringJoins,
  ]).option({ maxTimeMS: 5000 });
  return {
    ...providerRow(provider),
    description: provider.description,
    address: provider.address
      ? {
          addressLine: provider.address.addressLine,
          city: provider.address.city,
          state: provider.address.state,
          pincode: provider.address.pincode,
        }
      : undefined,
    businessImage: provider.businessImage,
    areas: legacyCoverage(provider),
    lastReview: reviewSummary(provider.lastReview),
    progress,
    offerings: rows.map(offeringRow),
    history: await auditHistory("provider", id),
  };
}
export async function readOffering(id: string) {
  await requireAdmin();
  const [row] = await ServiceOffering.aggregate<OfferingRow>([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    { $limit: 1 },
    ...offeringJoins,
  ]).option({ maxTimeMS: 5000 });
  if (!row) throw new ApiAuthError("Service offering not found", 404);
  return {
    ...offeringRow(row),
    catalogDescription: row.catalog?.description,
    categoryKey: row.catalog?.categoryKey,
    providerImage: row.provider?.businessImage,
    history: await auditHistory("offering", id),
  };
}
export async function readAdminCatalog(raw: Record<string, unknown>) {
  await requireAdmin();
  const input = parseAdminList(raw);
  if (!["all", "active", "inactive", ""].includes(input.status))
    throw new ApiAuthError("Choose a valid catalog filter.", 400);
  const rows = await PriceItem.find({
    ...adminCursorFilter(input),
    ...(input.type !== "all" ? { itemType: input.type } : {}),
    ...(input.status === "active"
      ? { isActive: true }
      : input.status === "inactive"
        ? { isActive: false }
        : {}),
    ...(input.category ? { categoryKey: input.category } : {}),
    ...(input.q
      ? { name: { $regex: escapeRegex(input.q), $options: "i" } }
      : {}),
  })
    .select(
      "name itemType catalogKey categoryKey skillKeys price suggestedPrice taxPercent unit isActive description reviewVersion",
    )
    .sort({ _id: input.direction === "previous" ? 1 : -1 })
    .limit(input.limit + 1)
    .maxTimeMS(5000)
    .lean();
  const page = adminPage(rows, input);
  const items: AdminCatalogRow[] = page.items.map((row) => ({
    _id: String(row._id),
    itemType: row.itemType,
    name: row.name,
    catalogKey: row.catalogKey,
    categoryKey: row.categoryKey,
    skillKeys: row.skillKeys || [],
    price: row.price,
    suggestedPrice:
      row.suggestedPrice?.amount !== undefined
        ? row.suggestedPrice
        : row.itemType === "service" && row.price > 0
          ? {
              amount: row.price,
              currency: "INR",
              unit: row.unit || "job",
              kind: "configured",
              qualification:
                "Existing administrator-configured reference; not independently researched market pricing.",
            }
          : null,
    taxPercent: row.taxPercent ?? 18,
    unit: row.unit || "job",
    isActive: row.isActive,
    description: row.description,
    reviewVersion: revisionOf(row),
  }));
  return {
    ...page,
    items,
    filters: input,
    categories: [
      ...catalogCategories,
      { key: "other", label: "Other services", isActive: true },
    ],
    skills: catalogSkills,
    units: pricingUnits,
  };
}
export async function readAdminOverview() {
  await requireAdmin();
  const submitted = { onboardingCompletedAt: { $type: "date" as const } };
  const [
    pendingProviders,
    changesRequested,
    pendingOfferings,
    approvedActiveProviders,
    activeCatalogServices,
    providers,
    offerings,
  ] = await Promise.all([
    ServiceProvider.countDocuments({
      ...submitted,
      verificationStatus: { $in: ["pending", null] },
    }).maxTimeMS(5000),
    ServiceProvider.countDocuments({
      ...submitted,
      verificationStatus: "changes_requested",
    }).maxTimeMS(5000),
    ServiceOffering.countDocuments({
      approvalStatus: { $in: ["pending", null] },
    }).maxTimeMS(5000),
    ServiceProvider.countDocuments({
      ...submitted,
      verificationStatus: "verified",
      status: "active",
    }).maxTimeMS(5000),
    PriceItem.countDocuments({ itemType: "service", isActive: true }).maxTimeMS(
      5000,
    ),
    readProviders({ status: "pending", limit: 5 }),
    readOfferings({ status: "pending", limit: 5 }),
  ]);
  return {
    metrics: {
      pendingProviders,
      changesRequested,
      pendingOfferings,
      approvedActiveProviders,
      activeCatalogServices,
    },
    providers: providers.items,
    offerings: offerings.items,
  };
}
