import mongoose from "mongoose";
import nextEnv from "@next/env";
import {
  pushIndexDefinitions,
  matchesPushIndex,
} from "../lib/push-indexes.mjs";

nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const apply = args.includes("--apply");
try {
  if (args.some((arg) => !["--print", "--apply", "--indexes"].includes(arg)))
    throw new Error("Invalid options");
  if (args.includes("--print")) {
    console.log(
      JSON.stringify(
        {
          mode: "offline preview",
          indexes: pushIndexDefinitions,
          deletes: false,
          backfill: false,
          keyGeneration: false,
          pushDelivery: false,
          requiresTransactions: true,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
  if (!process.env.MONGODB_URI)
    throw new Error("Database configuration is required");
  await mongoose.connect(process.env.MONGODB_URI, {
    autoCreate: false,
    autoIndex: false,
  });
  const db = mongoose.connection.db;
  const checks = [];
  for (const [name, keys, options] of pushIndexDefinitions) {
    const collection = db.collection(name);
    const duplicateGroups = options.unique
      ? await collection
          .aggregate([
            { $match: options.partialFilterExpression || {} },
            {
              $group: {
                _id: Object.fromEntries(
                  Object.keys(keys).map((key) => [key, `$${key}`]),
                ),
                count: { $sum: 1 },
              },
            },
            { $match: { count: { $gt: 1 } } },
            { $limit: 10 },
            { $project: { _id: 0, count: 1 } },
          ])
          .toArray()
      : [];
    let indexes = [];
    try {
      indexes = await collection.listIndexes().toArray();
    } catch (error) {
      if (error.code !== 26) throw error;
    }
    const ready = matchesPushIndex(indexes, keys, options);
    checks.push({
      collection: name,
      keys,
      ready,
      duplicateGroupsFound: duplicateGroups.length,
    });
  }
  console.log(
    JSON.stringify(
      { dryRun: !apply, checks, endpointOrKeyValuesPrinted: false },
      null,
      2,
    ),
  );
  if (checks.some((check) => check.duplicateGroupsFound)) {
    console.error(
      "Duplicate references need operator review. No subscriptions or notifications were merged or deleted; indexes were not installed.",
    );
    process.exitCode = 1;
  } else if (apply && args.includes("--indexes")) {
    for (const [name, keys, options] of pushIndexDefinitions)
      await db.collection(name).createIndex(keys, options);
    console.log(
      "Push subscription indexes verified/installed. No keys were generated and no notifications were sent.",
    );
  } else if (apply)
    console.log(
      "No backfill is needed. Add --indexes after reviewing the preflight to install the required indexes.",
    );
} catch {
  console.error(
    "Push index verification failed. Review database access, options and duplicate references. No endpoint, subscription key or VAPID credential was printed.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
