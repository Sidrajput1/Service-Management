import { AdminOperationError } from "../lib/admin-operations-policy.mjs";
import mongoose from "mongoose";
import nextEnv from "@next/env";
import { moderationMessage } from "../lib/moderation-message.mjs";
nextEnv.loadEnvConfig(process.cwd());
try {
  const flags = process.argv.slice(2);
  if (flags.some((flag) => flag !== "--apply"))
    throw new AdminOperationError(
      "Supported option: --apply. The default is a dry run of at most 100 pending decisions.",
    );
  if (!process.env.MONGODB_URI)
    throw new AdminOperationError(
      "MONGODB_URI is required. No notifications were changed.",
    );
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db,
    apply = flags.includes("--apply"),
    audits = db.collection("moderationaudits"),
    notifications = db.collection("notifications");
  let pending = 0,
    sent = 0,
    failed = 0;
  for await (const audit of audits
    .find({
      notificationState: "pending",
      notificationRecipientId: { $type: "objectId" },
    })
    .sort({ _id: 1 })
    .limit(100)) {
    pending++;
    if (!apply) continue;
    try {
      const message = moderationMessage(audit);
      await notifications.updateOne(
        { dedupeKey: message.dedupeKey },
        {
          $setOnInsert: {
            ...message,
            recipientUserId: audit.notificationRecipientId,
            entityId: audit.targetId,
            status: "unread",
            channel: "in_app",
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      await audits.updateOne(
        { _id: audit._id },
        {
          $set: { notificationState: "sent", notifiedAt: new Date() },
          $inc: { notificationAttempts: 1 },
        },
      );
      sent++;
    } catch {
      failed++;
      await audits
        .updateOne({ _id: audit._id }, { $inc: { notificationAttempts: 1 } })
        .catch(() => {});
    }
  }
  console.log(
    JSON.stringify(
      {
        dryRun: !apply,
        pendingInBatch: pending,
        sent,
        failed,
        note: "Rerun for further batches. Dedupe keys preserve one notification per committed decision.",
      },
      null,
      2,
    ),
  );
  if (failed) process.exitCode = 1;
} catch (error) {
  console.error(
    error instanceof AdminOperationError
      ? error.message
      : "Retry could not complete. Pending audit decisions remain committed and retryable.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
