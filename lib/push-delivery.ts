import "server-only";
import webpush from "web-push";
import Notification from "@/models/notification";
import PushSubscription from "@/models/PushSubscription";
import User from "@/models/user";
import { connectToDb } from "./db";
import { getPushConfiguration } from "./push-config";
import { pushStorageReady } from "./push-subscriptions";
import { pushEnvelope, pushEvents } from "./push-policy.mjs";
import { validPushEndpoint, validPushKey } from "./push-security";

interface DeliverySummary {
  sent: number;
  inactive: number;
  failed: number;
  skipped: number;
}
const emptySummary = (): DeliverySummary => ({
  sent: 0,
  inactive: 0,
  failed: 0,
  skipped: 0,
});

/** One best-effort attempt per existing notification; never a business-event transaction. */
export async function deliverNotificationPush(
  notificationId: string,
): Promise<DeliverySummary> {
  const summary = emptySummary(),
    configuration = getPushConfiguration();
  if (!configuration || !/^[a-f\d]{24}$/i.test(notificationId)) return summary;
  await connectToDb();
  if (!(await pushStorageReady())) return summary;
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      channel: "in_app",
      pushEvent: { $in: [...pushEvents] },
      recipientUserId: { $exists: true },
      "pushDelivery.claimedAt": { $exists: false },
    },
    { $set: { "pushDelivery.claimedAt": new Date() } },
    { new: true },
  )
    .select("+pushEvent +pushDelivery")
    .lean();
  if (!notification?.recipientUserId) return summary;
  try {
    const user = await User.findOne({
      _id: notification.recipientUserId,
      isActive: { $ne: false },
    })
      .select("_id role credentialVersion mustChangePassword")
      .lean();
    if (
      !user ||
      user.mustChangePassword ||
      (notification.recipientRole && notification.recipientRole !== user.role)
    ) {
      summary.skipped++;
      return summary;
    }
    const subscriptions = await PushSubscription.find({
      userId: user._id,
      isActive: true,
      sessionExpiresAt: { $gt: new Date() },
      credentialVersion: user.credentialVersion || 0,
      activatedAt: { $lte: notification.createdAt },
    })
      .select(
        "+endpoint +keys +bindingToken +sessionHash +sessionExpiresAt +expirationTime +activatedAt",
      )
      .limit(20)
      .lean();
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const current = {
          _id: subscription._id,
          userId: user._id,
          isActive: true,
          bindingToken: subscription.bindingToken,
        };
        try {
          if (
            !validPushEndpoint(subscription.endpoint) ||
            !validPushKey(subscription.keys.p256dh, 65) ||
            !validPushKey(subscription.keys.auth, 16)
          ) {
            summary.skipped++;
            return;
          }
          if (
            subscription.expirationTime &&
            new Date(subscription.expirationTime).getTime() <= Date.now()
          ) {
            await PushSubscription.updateOne(current, {
              $set: { isActive: false },
            });
            summary.inactive++;
            return;
          }
          if (!(await PushSubscription.exists(current))) {
            summary.skipped++;
            return;
          }
          const payload = JSON.stringify(
            pushEnvelope(
              notificationId,
              String(subscription._id),
              subscription.bindingToken,
            ),
          );
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: subscription.keys },
            payload,
            {
              vapidDetails: configuration,
              TTL: 120,
              urgency: "normal",
              timeout: 5000,
            },
          );
          summary.sent++;
        } catch (error) {
          const code = (error as { statusCode?: number } | null)?.statusCode;
          if (code === 404 || code === 410) {
            try {
              await PushSubscription.updateOne(current, {
                $set: { isActive: false },
              });
              summary.inactive++;
            } catch {
              summary.failed++;
            }
          } else summary.failed++;
        }
      }),
    );
    return summary;
  } finally {
    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          "pushDelivery.finishedAt": new Date(),
          "pushDelivery.sent": summary.sent,
          "pushDelivery.inactive": summary.inactive,
          "pushDelivery.failed": summary.failed,
          "pushDelivery.skipped": summary.skipped,
        },
      },
    );
  }
}

/** The custom server may continue this task; process shutdown can still lose a push. */
export function scheduleNotificationPush(notificationId: string) {
  queueMicrotask(() => {
    void deliverNotificationPush(notificationId).catch(() => {
      console.error(
        "Optional push delivery failed; the in-app notification is saved.",
      );
    });
  });
}
