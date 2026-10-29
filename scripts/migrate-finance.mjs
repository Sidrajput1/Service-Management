import mongoose from "mongoose";
import nextEnv from "@next/env";
import {
  financeIndexDefinitions,
  matchingFinanceIndex,
} from "../lib/finance-indexes.mjs";
nextEnv.loadEnvConfig(process.cwd());
const flags = process.argv.slice(2),
  apply = flags.includes("--apply"),
  install = flags.includes("--indexes");
try {
  if (flags.some((flag) => !["--apply", "--indexes", "--print"].includes(flag)))
    throw new Error("Unsupported options");
  if (flags.includes("--print")) {
    console.log(
      JSON.stringify(
        {
          mode: "offline preview",
          indexes: financeIndexDefinitions,
          backfill: false,
          automaticRates: false,
          automaticApprovals: false,
          deletes: false,
          requiresTransactionDeployment: true,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
  if (!process.env.MONGODB_URI) {
    console.error(
      "MONGODB_URI is required. Use --print for an offline preview. No data was changed.",
    );
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    autoCreate: false,
    autoIndex: false,
  });
  const db = mongoose.connection.db;
  const checks = [];
  for (const [name, keys, options] of financeIndexDefinitions) {
    const collection = db.collection(name),
      duplicates = await collection
        .aggregate([
          { ...{ $match: options.partialFilterExpression || {} } },
          {
            $group: {
              _id: Object.fromEntries(
                Object.keys(keys).map((key) => [
                  key.replaceAll(".", "_"),
                  `$${key}`,
                ]),
              ),
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
          { $limit: 10 },
          { $project: { _id: 0, count: 1 } },
        ])
        .toArray();
    let indexes = [];
    try {
      indexes = await collection.listIndexes().toArray();
    } catch (error) {
      if (error.code !== 26) throw error;
    }
    checks.push({
      collection: name,
      key: keys,
      duplicateGroupsFound: duplicates.length,
      ready: matchingFinanceIndex(indexes, keys, options),
    });
  }
  console.log(
    JSON.stringify(
      { dryRun: !apply, checks, bankDetailsPrinted: false },
      null,
      2,
    ),
  );
  if (checks.some((row) => row.duplicateGroupsFound)) {
    console.error(
      "Duplicate financial references need operator review. No records are merged, deleted or overwritten; indexes were not installed.",
    );
    process.exitCode = 1;
  } else if (apply && install) {
    for (const [name, keys, options] of financeIndexDefinitions)
      await db.collection(name).createIndex(keys, options);
    console.log(
      "Required finance indexes installed. No historical rate, approval, payment or payout was invented.",
    );
  } else if (apply)
    console.log(
      "No backfill is required. Add --indexes to explicitly install the reviewed indexes.",
    );
} catch {
  console.error(
    "Finance index verification failed. Check database access and duplicate references; no secret or payout details were printed.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
