import mongoose from "mongoose";
import nextEnv from "@next/env";
import { arrivalMessage } from "../lib/arrival-message.mjs";
nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2),
  apply = args.includes("--apply");
try {
  if (args.some((arg) => !["--apply", "--indexes", "--help"].includes(arg)))
    throw new Error("options");
  if (args.includes("--help")) {
    console.log(
      "node scripts/retry-arrival-notifications.mjs [--apply] [--indexes]. Dry run by default; at most 100 pending jobs. Install indexes with --apply --indexes before enabling arrival writes.",
    );
    process.exit(0);
  }
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is required; no data was changed.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db,
    jobs = db.collection("jobs"),
    notifications = db.collection("notifications");
  if (apply && args.includes("--indexes")) {
    await jobs.createIndex({ "arrivalNotification.state": 1, _id: 1 });
    await notifications.createIndex(
      { dedupeKey: 1 },
      {
        unique: true,
        partialFilterExpression: { dedupeKey: { $type: "string" } },
      },
    );
  }
  let pending = 0,
    sent = 0,
    failed = 0;
  for await (const job of jobs
    .find(
      { "arrivalNotification.state": "pending", arrivedAt: { $type: "date" } },
      { projection: { bookingId: 1, arrivalNotification: 1 } },
    )
    .sort({ _id: 1 })
    .limit(100)) {
    pending++;
    if (!apply) continue;
    try {
      if (job.arrivalNotification.recipientUserId) {
        const message = arrivalMessage(
          job._id,
          job.bookingId,
          job.arrivalNotification.recipientUserId,
        );
        await notifications.updateOne(
          { dedupeKey: message.dedupeKey },
          {
            $setOnInsert: {
              ...message,
              recipientUserId: job.arrivalNotification.recipientUserId,
              entityId: job._id,
              status: "unread",
              channel: "in_app",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      }
      await jobs.updateOne(
        { _id: job._id, "arrivalNotification.state": "pending" },
        {
          $set: {
            "arrivalNotification.state": "sent",
            "arrivalNotification.sentAt": new Date(),
          },
          $inc: { "arrivalNotification.attempts": 1 },
        },
      );
      sent++;
    } catch {
      failed++;
      await jobs
        .updateOne(
          { _id: job._id },
          { $inc: { "arrivalNotification.attempts": 1 } },
        )
        .catch(() => {});
    }
  }
  console.log(
    JSON.stringify({ dryRun: !apply, pending, sent, failed }, null, 2),
  );
  if (failed) process.exitCode = 1;
} catch {
  console.error(
    "Arrival notification retry could not complete. Pending arrivals remain committed; inspect the database configuration securely. No credentials are printed.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
