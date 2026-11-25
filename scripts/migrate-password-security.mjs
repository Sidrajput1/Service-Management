import mongoose from "mongoose";
import nextEnv from "@next/env";
import {
  passwordIndexDefinitions,
  matchesPasswordIndex,
} from "../lib/password-indexes.mjs";
nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const apply = args.includes("--apply");
try {
  if (
    args.some((value) => !["--print", "--apply", "--indexes"].includes(value))
  )
    throw new Error("Invalid options");
  if (args.includes("--print")) {
    console.log(
      JSON.stringify(
        {
          mode: "offline preview",
          indexes: passwordIndexDefinitions,
          requiresTransactions: true,
          userBackfill: false,
          passwordRotation: false,
          emailDelivery: false,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
  if (!process.env.MONGODB_URI)
    throw new Error("Database configuration required");
  await mongoose.connect(process.env.MONGODB_URI, {
    autoCreate: false,
    autoIndex: false,
  });
  const db = mongoose.connection.db;
  const hello = await db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid")
    throw new Error("Transactions required");
  const checks = [];
  for (const [name, keys, options] of passwordIndexDefinitions) {
    let indexes = [],
      duplicateGroups = [];
    try {
      indexes = await db.collection(name).listIndexes().toArray();
      if (options.unique)
        duplicateGroups = await db
          .collection(name)
          .aggregate([
            {
              $group: {
                _id: Object.fromEntries(
                  Object.keys(keys).map((key) => [key, `$${key}`]),
                ),
                count: { $sum: 1 },
              },
            },
            { $match: { count: { $gt: 1 } } },
            { $limit: 1 },
            { $project: { _id: 0, count: 1 } },
          ])
          .toArray();
    } catch (error) {
      if (error.code !== 26) throw error;
    }
    checks.push({
      collection: name,
      keys,
      ready: matchesPasswordIndex(indexes, keys, options),
      duplicateGroupsFound: duplicateGroups.length,
    });
  }
  console.log(
    JSON.stringify(
      { dryRun: !apply, checks, sensitiveValuesPrinted: false },
      null,
      2,
    ),
  );
  if (checks.some((check) => check.duplicateGroupsFound))
    throw new Error("Duplicate references require operator review");
  if (apply && args.includes("--indexes")) {
    for (const [name, keys, options] of passwordIndexDefinitions)
      await db.collection(name).createIndex(keys, options);
    console.log(
      "Password security indexes installed. No users, credentials or verification states were modified; no email was sent.",
    );
  } else if (apply)
    console.log(
      "No backfill is required. Use --apply --indexes only after reviewing the preflight.",
    );
} catch {
  console.error(
    "Password security preflight failed. Review MongoDB transactions, collection/index permissions and duplicate references. No credentials or account identifiers were printed.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
