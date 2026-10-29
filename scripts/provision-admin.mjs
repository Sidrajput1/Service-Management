import { AdminOperationError } from "../lib/admin-operations-policy.mjs";
import mongoose from "mongoose";
import nextEnv from "@next/env";
import { createHash } from "node:crypto";
import {
  provisionArguments,
  provisionIssue,
} from "../lib/admin-operations-policy.mjs";
nextEnv.loadEnvConfig(process.cwd());
try {
  const options = provisionArguments(process.argv.slice(2));
  if (options.help) {
    console.log(
      "Dry run: npm run admin:provision -- --user-id <existing-account-id> --operator <trusted-operator-id>\nApply: add --apply --ack-admin-access --request-id <UUID-v4>. No passwords or email addresses are accepted. Run only from an authorized database-operator environment.",
    );
    process.exit(0);
  }
  if (!process.env.MONGODB_URI)
    throw new AdminOperationError(
      "MONGODB_URI is required. No account was modified.",
    );
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db,
    users = db.collection("users"),
    audits = db.collection("moderationaudits"),
    targetId = new mongoose.Types.ObjectId(options["user-id"]);
  // Provisioning must be usable before the application starts. Create only its unique retry index.
  if (options.apply)
    await audits.createIndex({ actorKey: 1, requestId: 1 }, { unique: true });
  const actorKey = `operator:${options.operator}`,
    key = { actorKey, requestId: options["request-id"] },
    requestHash = createHash("sha256")
      .update(`grant-admin:${targetId}`)
      .digest("hex");
  const run = async (session) => {
    const previous = options.apply
      ? await audits.findOne(key, { session })
      : null;
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new AdminOperationError(
          "This request ID belongs to a different provisioning operation.",
        );
      return {
        replayed: true,
        targetId: String(targetId),
        role: previous.after.role,
      };
    }
    const user = await users.findOne(
      { _id: targetId },
      {
        session,
        projection: {
          role: 1,
          isActive: 1,
          mustChangePassword: 1,
          credentialVersion: 1,
        },
      },
    );
    const provider = await db
        .collection("serviceproviders")
        .findOne({ ownerId: targetId }, { session, projection: { _id: 1 } }),
      technician = await db
        .collection("technicians")
        .findOne({ userId: targetId }, { session, projection: { _id: 1 } });
    const issue = provisionIssue(user, Boolean(provider || technician));
    if (issue) throw new AdminOperationError(issue);
    if (!options.apply)
      return {
        dryRun: true,
        targetId: String(targetId),
        previousRole: user.role,
        resultingRole: "admin",
        existingAdminAccounts: await users.countDocuments({ role: "admin" }),
        note: "Verify the account owner and review all existing admin accounts before granting access. Existing sessions will be invalidated on apply.",
      };
    if (user.role === "admin")
      return { targetId: String(targetId), alreadyAdmin: true };
    const version = user.credentialVersion || 0;
    const result = await users.updateOne(
      {
        _id: targetId,
        role: user.role,
        isActive: { $ne: false },
        ...(version
          ? { credentialVersion: version }
          : {
              $or: [
                { credentialVersion: 0 },
                { credentialVersion: { $exists: false } },
              ],
            }),
      },
      {
        $set: { role: "admin", updatedAt: new Date() },
        $inc: { credentialVersion: 1 },
      },
      { session },
    );
    if (result.modifiedCount !== 1)
      throw new AdminOperationError(
        "Account changed. Inspect it again before retrying.",
      );
    await audits.insertOne(
      {
        ...key,
        actorKind: "operator",
        requestHash,
        targetType: "admin_account",
        targetId,
        action: "grant_admin",
        reason: "Explicit authorized operator provisioning",
        before: { role: user.role, credentialVersion: version },
        after: { role: "admin", credentialVersion: version + 1 },
        notificationState: "none",
        notificationAttempts: 0,
        createdAt: new Date(),
      },
      { session },
    );
    return { targetId: String(targetId), role: "admin", signInAgain: true };
  };
  let result;
  if (options.apply) {
    const session = await mongoose.startSession();
    try {
      result = await session.withTransaction(() => run(session));
    } finally {
      await session.endSession();
    }
  } else result = await run();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    error instanceof AdminOperationError
      ? error.message
      : "Provisioning could not complete. Inspect the database connection and transaction support securely; no credentials are printed.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
