import { publishedOfferingFilter } from "@/lib/moderation-policy.mjs";
import "server-only";
import mongoose, { type PipelineStage } from "mongoose";
import { connectToDb } from "@/lib/db";
import ServiceOffering from "@/models/ServiceOffering";
import ServiceProvider from "@/models/ServiceProvider";
import PriceItem from "@/models/PriceItem";
import {
  escapeRegex,
  normalizeKey,
  normalizeCityKey,
  normalizeStateKey,
  normalizePincode,
  cityAliasKeys,
  stateAliasKeys,
  servesLocation,
  legacyCoverage,
} from "@/lib/marketplace-policy.mjs";
import {
  catalogCategories,
  catalogSearchAliases,
} from "@/lib/catalog/definition.mjs";
import { parseDiscovery } from "@/lib/marketplace-validation";
import type {
  DiscoveryResult,
  DiscoveryOffering,
} from "@/lib/marketplace-types";

export const eligibleProvider = {
  status: "active",
  verificationStatus: "verified",
  onboardingCompletedAt: { $type: "date" },
};
export function providerCoverageFilter(search: {
  city?: string;
  state?: string;
  locality?: string;
  pincode?: string;
}): Record<string, unknown> {
  const city = normalizeCityKey(search.city),
    state = normalizeStateKey(search.state),
    locality = normalizeKey(search.locality),
    pincode = normalizePincode(search.pincode),
    cities = cityAliasKeys(city),
    states = stateAliasKeys(state);
  const conditions: Record<string, unknown>[] = [];
  if (state)
    conditions.push({
      $or: [
        { stateKey: states.length > 1 ? { $in: states } : state },
        { stateKey: "" },
        { stateKey: { $exists: false } },
      ],
    });
  if (locality)
    conditions.push({
      $or: [
        { localityKey: locality },
        ...(city || pincode ? [{ localityKey: "" }] : []),
      ],
    });
  if (pincode)
    conditions.push({
      $or: [
        { pincode },
        ...(city
          ? [{ pincode: "", ...(!locality ? { localityKey: "" } : {}) }]
          : []),
      ],
    });
  const area = {
    isActive: true,
    ...(city ? { cityKey: cities.length > 1 ? { $in: cities } : city } : {}),
    ...(conditions.length ? { $and: conditions } : {}),
  };
  const legacyTerms: Record<string, unknown>[] = [
    { coverageVersion: { $ne: 1 } },
    { "serviceAreas.0": { $exists: true } },
  ];
  if (pincode) legacyTerms.push({ serviceAreas: pincode });
  const exactAliases = (aliases: string[]) =>
    `^(?:${aliases.map(escapeRegex).join("|")})$`;
  if (state)
    legacyTerms.push({
      $or: [
        { "address.state": { $regex: exactAliases(states), $options: "i" } },
        { "address.state": "" },
        { "address.state": { $exists: false } },
      ],
    });
  // Mixed free-text legacy locality/PIN records are ambiguous. Require review in Service areas.
  if (locality) legacyTerms.push({ _id: { $exists: false } });
  if (city)
    legacyTerms.push(
      { "address.city": { $regex: exactAliases(cities), $options: "i" } },
      {
        $or: [
          { serviceAreas: { $regex: exactAliases(cities), $options: "i" } },
          { serviceAreas: { $regex: /^[1-9]\d{5}$/ } },
          ...(locality
            ? [
                {
                  serviceAreas: {
                    $regex: `^${escapeRegex(locality)}$`,
                    $options: "i",
                  },
                },
              ]
            : []),
        ],
      },
    );
  // PIN restrictions never become a city-wide promise; a requested PIN must be explicit.
  return {
    $or: [
      { coverageVersion: 1, coverageAreas: { $elemMatch: area } },
      { $and: legacyTerms },
    ],
  };
}
export async function discover(
  request: Request,
  options: { topRated?: boolean } = {},
): Promise<DiscoveryResult> {
  const filters = parseDiscovery(request);
  await connectToDb();
  if (options.topRated) filters.sort = "rating";
  const natural = !filters.city && filters.q.match(/^(.+?)\s+in\s+(.+)$/i);
  if (natural) {
    filters.q = natural[1].trim();
    filters.city = natural[2].trim();
  }
  const query = normalizeKey(filters.q);
  const matchingCategories = catalogCategories
    .filter(
      (category) =>
        normalizeKey(category.label).includes(query) ||
        (catalogSearchAliases[category.key] || []).some(
          (alias) => alias === query,
        ),
    )
    .map((category) => category.key);
  const serviceFilter = {
    itemType: "service",
    isActive: true,
    ...(filters.category
      ? {}
      : {
          categoryKey: {
            $in: [
              ...catalogCategories
                .filter((category) => category.isActive)
                .map((category) => category.key),
              "other",
              null,
              "",
            ],
          },
        }),
    ...(filters.category === "other"
      ? { categoryKey: { $in: ["other", null, ""] } }
      : filters.category
        ? { categoryKey: filters.category }
        : {}),
    ...(query
      ? {
          $or: [
            { name: { $regex: escapeRegex(query), $options: "i" } },
            ...(matchingCategories.length
              ? [{ categoryKey: { $in: matchingCategories } }]
              : []),
          ],
        }
      : {}),
  };
  const hasLocation = Boolean(
    filters.city || filters.state || filters.locality || filters.pincode,
  );
  const otherArea = filters.scope === "other" && hasLocation;
  const providerFilter = {
    ...eligibleProvider,
    ...(otherArea
      ? {
          $and: [
            providerCoverageFilter({}),
            { $nor: [providerCoverageFilter(filters)] },
          ],
        }
      : providerCoverageFilter(filters)),
    ...(filters.providerId
      ? { _id: new mongoose.Types.ObjectId(filters.providerId) }
      : {}),
    ...(filters.provider
      ? {
          companyName: { $regex: escapeRegex(filters.provider), $options: "i" },
        }
      : {}),
    ...(filters.minRating
      ? {
          "ratingSummary.average": { $gte: filters.minRating },
          "ratingSummary.count": { $gte: 1 },
        }
      : {}),
    ...(options.topRated
      ? {
          "ratingSummary.count": { $gte: 5 },
          "ratingSummary.average": { $gte: 4 },
        }
      : {}),
  };
  const now = new Date();
  const pipeline: PipelineStage[] = [
    {
      $match: {
        ...publishedOfferingFilter,
        ...(filters.serviceId
          ? { priceItemId: new mongoose.Types.ObjectId(filters.serviceId) }
          : {}),
      },
    },
    {
      $lookup: {
        from: PriceItem.collection.name,
        localField: "priceItemId",
        foreignField: "_id",
        pipeline: [
          { $match: serviceFilter },
          { $project: { name: 1, categoryKey: 1, description: 1 } },
        ],
        as: "catalog",
      },
    },
    { $unwind: "$catalog" },
    {
      $lookup: {
        from: ServiceProvider.collection.name,
        localField: "serviceProviderId",
        foreignField: "_id",
        pipeline: [
          { $match: providerFilter },
          {
            $project: {
              companyName: 1,
              description: 1,
              businessImage: 1,
              coverageAreas: 1,
              coverageVersion: 1,
              serviceAreas: 1,
              "address.city": 1,
              "address.state": 1,
              ratingSummary: 1,
            },
          },
        ],
        as: "provider",
      },
    },
    { $unwind: "$provider" },
    {
      $set: {
        offerActive: {
          $and: [
            { $eq: ["$offerEnabled", true] },
            {
              $or: [
                { $not: ["$offerStartsAt"] },
                { $lte: ["$offerStartsAt", now] },
              ],
            },
            {
              $or: [
                { $not: ["$offerEndsAt"] },
                { $gte: ["$offerEndsAt", now] },
              ],
            },
          ],
        },
        rankingScore: { $ifNull: ["$provider.ratingSummary.score", 0] },
        quoteOnly: {
          $cond: [{ $eq: ["$pricingModel", "quote_required"] }, 1, 0],
        },
      },
    },
    {
      $set: {
        finalPrice: {
          $subtract: [
            "$price",
            {
              $cond: [
                "$offerActive",
                {
                  $min: [
                    "$price",
                    {
                      $cond: [
                        { $eq: ["$discountType", "percentage"] },
                        {
                          $multiply: [
                            "$price",
                            { $divide: ["$discountValue", 100] },
                          ],
                        },
                        { $ifNull: ["$discountValue", 0] },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          ],
        },
      },
    },
  ];
  if (options.topRated)
    pipeline.push(
      {
        $sort: { rankingScore: -1, "provider.ratingSummary.count": -1, _id: 1 },
      },
      { $group: { _id: "$serviceProviderId", row: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$row" } },
    );
  const order: Record<string, 1 | -1> =
    filters.sort === "price_asc"
      ? { quoteOnly: 1, finalPrice: 1, _id: 1 }
      : filters.sort === "price_desc"
        ? { quoteOnly: 1, finalPrice: -1, _id: 1 }
        : { rankingScore: -1, "provider.ratingSummary.count": -1, _id: 1 };
  pipeline.push(
    { $sort: order },
    { $skip: (filters.page - 1) * filters.limit },
    { $limit: filters.limit + 1 },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        catalog: 1,
        provider: 1,
        price: 1,
        finalPrice: 1,
        taxPercent: 1,
        pricingModel: 1,
        unit: 1,
        offerActive: 1,
        offerName: 1,
        rankingScore: 1,
      },
    },
  );
  interface Row {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    catalog: {
      _id: mongoose.Types.ObjectId;
      name: string;
      description?: string;
      categoryKey?: string;
    };
    provider: {
      _id: mongoose.Types.ObjectId;
      companyName: string;
      description?: string;
      businessImage?: DiscoveryOffering["provider"]["businessImage"];
      serviceAreas: string[];
      coverageVersion?: number;
      coverageAreas?: unknown[];
      ratingSummary?: { average: number; count: number };
    };
    price: number;
    finalPrice: number;
    taxPercent: number;
    pricingModel?: DiscoveryOffering["pricing"]["model"];
    unit?: string;
    offerActive: boolean;
    offerName?: string;
    rankingScore: number;
  }
  const rows = await ServiceOffering.aggregate<Row>(pipeline).option({
    maxTimeMS: 5000,
  });
  return {
    page: filters.page,
    hasMore: rows.length > filters.limit,
    providers: rows.slice(0, filters.limit).map((row) => ({
      offeringId: String(row._id),
      provider: {
        id: String(row.provider._id),
        companyName: row.provider.companyName,
        description: row.provider.description,
        businessImage: row.provider.businessImage,
        coverageAreas: legacyCoverage(row.provider)
          .filter((area: { isActive?: boolean }) => area.isActive !== false)
          .map(
            (area: {
              city?: string;
              state?: string;
              locality?: string;
              pincode?: string;
            }) => ({
              city: area.city || "",
              state: area.state || "",
              locality: area.locality || "",
              pincode: area.pincode || "",
              isActive: true,
            }),
          ),
        serviceAreas: legacyCoverage(row.provider)
          .filter((area: { isActive?: boolean }) => area.isActive !== false)
          .map((area: { city?: string; locality?: string; pincode?: string }) =>
            [area.city, area.locality, area.pincode]
              .filter(Boolean)
              .join(" · "),
          ),
      },
      service: {
        id: String(row.catalog._id),
        name: row.name || row.catalog.name,
        description: row.description || row.catalog.description,
        categoryKey: row.catalog.categoryKey,
      },
      pricing: {
        basePrice: row.price,
        finalPrice: row.finalPrice,
        taxPercent: row.taxPercent,
        offerActive: row.offerActive,
        offerName: row.offerActive ? row.offerName : undefined,
        model: row.pricingModel || "fixed",
        unit: row.unit || "job",
      },
      rating: row.provider.ratingSummary?.count
        ? Math.round(row.provider.ratingSummary.average * 10) / 10
        : null,
      reviewCount: row.provider.ratingSummary?.count || 0,
      rankingScore: row.rankingScore,
      discoveryCoverage: hasLocation
        ? servesLocation(legacyCoverage(row.provider), filters)
          ? "matched"
          : "outside"
        : undefined,
    })),
  };
}
