import mongoose from "mongoose";
import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import {
  catalogServices,
  catalogSkills,
  suggestedPrices,
  catalogVersion,
} from "../lib/catalog/definition.mjs";
import {
  normalizeKey,
  legacyCoverage,
  confidenceRating,
} from "../lib/marketplace-policy.mjs";
import {
  catalogNameKey,
  catalogNamePattern,
} from "../lib/moderation-policy.mjs";
nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply"),
  activate = process.argv.includes("--activate-new"),
  migrateCoverage = process.argv.includes("--migrate-coverage");
if (process.argv.includes("--print")) {
  console.log(
    JSON.stringify(
      {
        catalogVersion,
        services: catalogServices.map((service) => ({
          ...service,
          suggestedPrice: suggestedPrices[service.key] || null,
          activatedByDefault: false,
        })),
        note: "New catalog items remain inactive unless --activate-new is explicitly supplied during apply. Existing offerings and all historical prices are untouched.",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (!process.env.MONGODB_URI) {
  console.error(
    "Set MONGODB_URI in your local environment before inspecting or applying the seed. Use --print to review the source catalog without a database.",
  );
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db,
    counts = { inserted: 0, linked: 0, coverage: 0, skills: 0, ratings: 0 };
  for (const service of catalogServices) {
    const existing = await db.collection("priceitems").findOne({
      $or: [
        { catalogKey: service.key },
        {
          itemType: "service",
          name: { $regex: catalogNamePattern(service.name), $options: "i" },
        },
      ],
    });
    if (existing) {
      const changes = {};
      if (!existing.catalogKey) changes.catalogKey = service.key;
      if (!existing.categoryKey) changes.categoryKey = service.categoryKey;
      if (!existing.skillKeys?.length) changes.skillKeys = service.skillKeys;
      if (!existing.unit) changes.unit = service.unit;
      if (Object.keys(changes).length) {
        counts.linked++;
        if (apply)
          await db
            .collection("priceitems")
            .updateOne({ _id: existing._id }, { $set: changes });
      }
    } else {
      counts.inserted++;
      if (apply)
        await db.collection("priceitems").updateOne(
          { catalogKey: service.key },
          {
            $setOnInsert: {
              catalogKey: service.key,
              itemType: "service",
              name: service.name,
              normalizedName: catalogNameKey(service.name),
              reviewVersion: 0,
              categoryKey: service.categoryKey,
              skillKeys: service.skillKeys,
              unit: service.unit,
              price: 0,
              taxPercent: 18,
              isActive: activate,
              ...(suggestedPrices[service.key]
                ? { suggestedPrice: suggestedPrices[service.key] }
                : {}),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
    }
  }
  for await (const provider of db
    .collection("serviceproviders")
    .find({})
    .batchSize(100)) {
    const areas = legacyCoverage(provider).map((area) => ({
      ...area,
      _id: randomUUID(),
    }));
    if (
      provider.coverageVersion !== 1 &&
      areas.length &&
      areas.every((area) => area.city && area.state)
    ) {
      counts.coverage++;
      if (apply && migrateCoverage)
        await db
          .collection("serviceproviders")
          .updateOne(
            { _id: provider._id, coverageVersion: { $ne: 1 } },
            { $set: { coverageVersion: 1, coverageAreas: areas } },
          );
    }
    const [rating] = await db
      .collection("reviews")
      .aggregate([
        { $match: { serviceProviderId: provider._id, status: "published" } },
        {
          $group: {
            _id: null,
            average: { $avg: "$providerRating" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    counts.ratings++;
    if (apply)
      await db.collection("serviceproviders").updateOne(
        { _id: provider._id },
        {
          $set: {
            ratingSummary: {
              average: rating?.average || 0,
              count: rating?.count || 0,
              score: confidenceRating(rating?.average || 0, rating?.count || 0),
              updatedAt: new Date(),
            },
          },
        },
      );
  }
  for await (const pro of db
    .collection("technicians")
    .find({
      $or: [{ skillKeys: { $exists: false } }, { skillKeys: { $size: 0 } }],
    })
    .batchSize(100)) {
    const keys = catalogSkills
      .filter((skill) =>
        (pro.skills || []).some(
          (label) =>
            normalizeKey(label) === normalizeKey(skill.label) ||
            label === skill.key,
        ),
      )
      .map((skill) => skill.key);
    if (keys.length) {
      counts.skills++;
      if (apply)
        await db
          .collection("technicians")
          .updateOne({ _id: pro._id }, { $set: { skillKeys: keys } });
    }
  }
  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLIED" : "DRY RUN — no changes",
        activateNewCatalogItems: activate,
        migrateLegacyCoverage: migrateCoverage,
        counts,
        review:
          "Existing service labels/prices, offerings, credentials, bookings and invoices were not reset. Review legacy coverage and unmatched skills manually. Providers with no onboardingCompletedAt remain excluded until setup is completed through the application.",
      },
      null,
      2,
    ),
  );
} finally {
  await mongoose.disconnect();
}
