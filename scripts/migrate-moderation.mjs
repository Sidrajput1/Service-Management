import { AdminOperationError } from "../lib/admin-operations-policy.mjs";
import mongoose from "mongoose";
import nextEnv from "@next/env";
import { legacyReviewChanges } from "../lib/admin-operations-policy.mjs";
import { catalogNameKey } from "../lib/moderation-policy.mjs";
nextEnv.loadEnvConfig(process.cwd());
const flags = process.argv.slice(2),
  apply = flags.includes("--apply"),
  indexes = flags.includes("--indexes");
const indexDefinitions = [
  ["serviceproviders", { verificationStatus: 1, _id: -1 }, {}],
  ["serviceofferings", { approvalStatus: 1, _id: -1 }, {}],
  [
    "serviceofferings",
    { serviceProviderId: 1, approvalStatus: 1, _id: -1 },
    {},
  ],
  ["priceitems", { itemType: 1, isActive: 1, _id: -1 }, {}],
  [
    "priceitems",
    { itemType: 1, normalizedName: 1 },
    {
      unique: true,
      partialFilterExpression: { normalizedName: { $type: "string" } },
    },
  ],
  ["moderationaudits", { actorKey: 1, requestId: 1 }, { unique: true }],
  ["moderationaudits", { targetType: 1, targetId: 1, createdAt: -1 }, {}],
  ["moderationaudits", { notificationState: 1, _id: 1 }, {}],
  [
    "notifications",
    { dedupeKey: 1 },
    {
      unique: true,
      partialFilterExpression: { dedupeKey: { $type: "string" } },
    },
  ],
];
try {
  if (flags.some((flag) => !["--apply", "--indexes", "--print"].includes(flag)))
    throw new AdminOperationError(
      "Supported options: --print, --apply, --indexes.",
    );
  if (flags.includes("--print")) {
    console.log(
      JSON.stringify(
        {
          mode: "preview",
          backfill:
            "Missing review revisions become 0. Missing offering approval becomes pending; existing approvals/provider verification are preserved. Missing offering currency becomes INR (the existing marketplace currency). Catalog names gain normalized identity after duplicate preflight.",
          indexes: indexDefinitions,
          destructiveChanges: false,
          automaticApprovals: false,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
  if (!process.env.MONGODB_URI)
    throw new AdminOperationError(
      "MONGODB_URI is required. Use --print for an offline migration preview.",
    );
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const identities = new Map(),
    duplicates = [];
  for await (const item of db
    .collection("priceitems")
    .find({}, { projection: { _id: 1, name: 1, itemType: 1 } })
    .batchSize(100)) {
    const identity = `${item.itemType}:${catalogNameKey(item.name)}`;
    if (identities.has(identity))
      duplicates.push([String(identities.get(identity)), String(item._id)]);
    else identities.set(identity, item._id);
  }
  if (duplicates.length) {
    console.log(
      JSON.stringify(
        {
          blocked: true,
          duplicatePairs: duplicates.slice(0, 100),
          totalDuplicatePairs: duplicates.length,
          note: "Resolve catalog identities through an authorized data review. This script never deletes, merges, renames, or approves records. No backfill or index changes were applied.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } else {
    const counts = { provider: 0, offering: 0, catalog: 0 };
    for (const [type, collection] of [
      ["provider", "serviceproviders"],
      ["offering", "serviceofferings"],
      ["catalog", "priceitems"],
    ]) {
      for await (const record of db
        .collection(collection)
        .find({})
        .batchSize(100)) {
        const changes = legacyReviewChanges(record, type);
        const updates = Object.entries(changes).filter(
          ([key, value]) => record[key] !== value,
        );
        if (!updates.length) continue;
        counts[type]++;
        if (apply) {
          const filter = { _id: record._id };
          for (const [key] of updates)
            filter[key] =
              record[key] === undefined ? { $exists: false } : record[key];
          const result = await db
            .collection(collection)
            .updateOne(filter, { $set: Object.fromEntries(updates) });
          if (result.matchedCount !== 1)
            throw new AdminOperationError(
              "A record changed during migration. Pause concurrent catalog writes and rerun the dry run.",
            );
        }
      }
    }
    if (apply && indexes)
      for (const [collection, keys, options] of indexDefinitions)
        await db.collection(collection).createIndex(keys, options);
    console.log(
      JSON.stringify(
        {
          dryRun: !apply,
          recordsNeedingBackfill: counts,
          indexesCreated: apply && indexes,
          automaticApprovals: false,
          historyDeleted: false,
        },
        null,
        2,
      ),
    );
  }
} catch (error) {
  console.error(
    error instanceof AdminOperationError
      ? error.message
      : "Migration stopped. Inspect database/index diagnostics securely. No record is deleted or automatically approved; backfills are safe to rerun.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
