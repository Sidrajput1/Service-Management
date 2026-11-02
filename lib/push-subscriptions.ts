import "server-only";
import mongoose, { type Types } from "mongoose";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import PushSubscription, {
  type IPushSubscription,
} from "@/models/PushSubscription";
import { pushIndexDefinitions, matchesPushIndex } from "./push-indexes.mjs";
import Notification from "@/models/notification";
import User from "@/models/user";
import { ApiAuthError } from "./auth";
import { getPushConfiguration } from "./push-config";
import { readPushLogin } from "./push-session";
import { equalPushSecret, registerPushSchema } from "./push-security";
import { pushEvents, safePushPath } from "./push-policy.mjs";

export type PushActor = {
  _id: Types.ObjectId;
  role: string;
  credentialVersion?: number;
};
export type PushLogin = NonNullable<Awaited<ReturnType<typeof readPushLogin>>>;
const privateFields =
  "+endpoint +keys +bindingToken +sessionHash +sessionExpiresAt +expirationTime +activatedAt";
const deviceLimit = 20;

export async function pushStorageReady() {
  const db = mongoose.connection.db;
  if (!db) return false;
  try {
    for (const [collection, keys, options] of pushIndexDefinitions) {
      const indexes = await db.collection(collection).listIndexes().toArray();
      if (!matchesPushIndex(indexes, keys, options)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
export async function requirePushStorageReady() {
  if (!(await pushStorageReady()))
    throw new ApiAuthError(
      "Browser notification storage needs administrator setup. In-app notifications remain available.",
      503,
    );
}
export function pushDeviceDto(row: IPushSubscription) {
  return {
    id: String(row._id),
    deviceLabel: row.deviceLabel,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSeenAt: row.lastSeenAt,
  };
}
function binding(row: IPushSubscription) {
  return {
    subscriptionId: String(row._id),
    bindingToken: row.bindingToken,
    ownerId: String(row.userId),
  };
}
export async function requirePushLogin(request: Request, actor: PushActor) {
  const login = await readPushLogin(request, String(actor._id));
  if (!login)
    throw new ApiAuthError(
      "Sign in again before managing browser notifications.",
      401,
    );
  return login;
}
export async function listPushDevices(actor: PushActor) {
  const storageReady = await pushStorageReady();
  if (!storageReady) return { devices: [], storageReady };
  const rows = await PushSubscription.find({ userId: actor._id })
    .sort({ isActive: -1, lastSeenAt: -1 })
    .limit(100)
    .lean();
  return { devices: rows.map(pushDeviceDto), storageReady };
}
export async function registerPushDevice(
  actor: PushActor,
  login: PushLogin,
  input: z.infer<typeof registerPushSchema>,
) {
  await requirePushStorageReady();
  if (!getPushConfiguration())
    throw new ApiAuthError(
      "Browser notifications are not configured yet. In-app notifications remain available.",
      503,
    );
  if (
    input.subscription.expirationTime &&
    input.subscription.expirationTime <= Date.now()
  )
    throw new ApiAuthError(
      "This browser subscription expired. Refresh it in notification settings.",
      409,
    );
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      // A user document write serializes active-device limits without adding a counter schema.
      const fence = await User.updateOne(
        { _id: actor._id, isActive: { $ne: false } },
        { $inc: { __v: 1 } },
        { session },
      );
      if (!fence.matchedCount)
        throw new ApiAuthError(
          "Your account is unavailable. Sign in again.",
          401,
        );
      const existing = await PushSubscription.findOne({
        endpoint: input.subscription.endpoint,
      })
        .select(privateFields)
        .session(session);
      const sameKeys = Boolean(
        existing &&
          equalPushSecret(
            existing.keys.p256dh,
            input.subscription.keys.p256dh,
          ) &&
          equalPushSecret(existing.keys.auth, input.subscription.keys.auth),
      );
      if (
        existing &&
        String(existing.userId) !== String(actor._id) &&
        !sameKeys
      )
        throw new ApiAuthError(
          "This browser subscription needs to be refreshed before registering it.",
          409,
        );
      await PushSubscription.updateMany(
        {
          userId: actor._id,
          isActive: true,
          $or: [
            { sessionExpiresAt: { $lte: new Date() } },
            { expirationTime: { $type: "date", $lte: new Date() } },
          ],
        },
        { $set: { isActive: false } },
        { session },
      );
      const count = await PushSubscription.countDocuments({
        userId: actor._id,
        isActive: true,
        ...(existing ? { _id: { $ne: existing._id } } : {}),
      }).session(session);
      if (count >= deviceLimit)
        throw new ApiAuthError(
          "Remove an old device before enabling notifications on another device.",
          409,
        );
      const sameAssociation =
        existing &&
        sameKeys &&
        existing.isActive &&
        existing.sessionExpiresAt > new Date() &&
        (!existing.expirationTime || existing.expirationTime > new Date()) &&
        String(existing.userId) === String(actor._id) &&
        existing.sessionHash === login.sessionHash &&
        existing.credentialVersion === (actor.credentialVersion || 0);
      const now = new Date();
      const fields = {
        userId: actor._id,
        endpoint: input.subscription.endpoint,
        keys: input.subscription.keys,
        deviceLabel: input.deviceLabel || "This browser",
        isActive: true,
        sessionHash: login.sessionHash,
        sessionExpiresAt: login.sessionExpiresAt,
        credentialVersion: actor.credentialVersion || 0,
        expirationTime: input.subscription.expirationTime
          ? new Date(input.subscription.expirationTime)
          : null,
        lastSeenAt: now,
        activatedAt: sameAssociation ? existing.activatedAt : now,
        bindingToken: sameAssociation
          ? existing.bindingToken
          : randomBytes(32).toString("hex"),
      };
      const row = existing
        ? await PushSubscription.findOneAndUpdate(
            { _id: existing._id },
            { $set: fields },
            { new: true, session, runValidators: true },
          ).select(privateFields)
        : (await PushSubscription.create([fields], { session }))[0];
      if (!row)
        throw new ApiAuthError(
          "The browser registration changed. Try again.",
          409,
        );
      return { device: pushDeviceDto(row), binding: binding(row) };
    });
    if (!result)
      throw new ApiAuthError(
        "Browser registration did not complete. Try again.",
        503,
      );
    return result;
  } catch (error) {
    if ((error as { code?: number })?.code === 11000)
      throw new ApiAuthError(
        "This browser registration changed. Retry registration.",
        409,
      );
    throw error;
  } finally {
    await session.endSession();
  }
}
function activeAssociation(actor: PushActor, login: PushLogin) {
  return {
    userId: actor._id,
    isActive: true,
    sessionHash: login.sessionHash,
    credentialVersion: actor.credentialVersion || 0,
    sessionExpiresAt: { $gt: new Date() },
    $or: [{ expirationTime: null }, { expirationTime: { $gt: new Date() } }],
  };
}
export async function currentPushDevice(
  actor: PushActor,
  login: PushLogin,
  endpoint: string,
) {
  await requirePushStorageReady();
  const row = await PushSubscription.findOne({
    ...activeAssociation(actor, login),
    endpoint,
  })
    .select(privateFields)
    .lean();
  return row
    ? { device: pushDeviceDto(row), binding: binding(row) }
    : { device: null, binding: null };
}
export async function disablePushDevice(
  actor: PushActor,
  id: string,
  expectedBindingToken?: string,
) {
  await requirePushStorageReady();
  const row = await PushSubscription.findOneAndUpdate(
    {
      _id: id,
      userId: actor._id,
      ...(expectedBindingToken ? { bindingToken: expectedBindingToken } : {}),
    },
    { $set: { isActive: false } },
    { new: true },
  );
  if (!row) throw new ApiAuthError("Device not found.", 404);
  return { disabled: true };
}
export async function resolvePushNotification(
  actor: PushActor,
  login: PushLogin,
  input: {
    notificationId: string;
    subscriptionId: string;
    bindingToken: string;
  },
) {
  await requirePushStorageReady();
  const device = await PushSubscription.findOne({
    ...activeAssociation(actor, login),
    _id: input.subscriptionId,
  })
    .select("+bindingToken")
    .lean();
  if (!device || !equalPushSecret(device.bindingToken, input.bindingToken))
    throw new ApiAuthError(
      "This notification is no longer available for this browser.",
      404,
    );
  const notification = await Notification.findOne({
    _id: input.notificationId,
    recipientUserId: actor._id,
    channel: "in_app",
  })
    .select("+pushEvent actionUrl recipientUserId")
    .lean<{ pushEvent?: string; actionUrl?: string }>();
  if (
    !notification?.pushEvent ||
    !(pushEvents as readonly string[]).includes(notification.pushEvent)
  )
    throw new ApiAuthError("Notification not found.", 404);
  return {
    title: "Servizato",
    body: "Open your account to review an update.",
    url: safePushPath(notification.actionUrl, actor.role),
    tag: `servizato-${input.notificationId}`,
  };
}
