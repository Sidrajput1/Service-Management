/** Isolated delivery boundaries. No database, key generation or real push requests. */
import { createFinanceFixture } from "./finance-fixture.mjs";
const id = (value) => value.toString(16).padStart(24, "0");
const browserKey = Buffer.from(
  "046b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c2964fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5",
  "hex",
).toString("base64url");
function set(row, values) {
  for (const [key, value] of Object.entries(values)) {
    const keys = key.split("."),
      last = keys.pop();
    let target = row;
    for (const part of keys) target = target[part] ||= {};
    target[last] = value;
  }
}
function query(value) {
  return {
    select() {
      return this;
    },
    lean() {
      return this;
    },
    limit() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}
export function deliveryFixture() {
  const f = createFinanceFixture(),
    state = {
      configured: true,
      ready: true,
      dbCalls: 0,
      notifications: [],
      subscriptions: [],
      sent: [],
      failures: new Map(),
      beforeSend: null,
      dispatches: [],
    };
  const user = {
    _id: id(1),
    role: "technician",
    credentialVersion: 0,
    isActive: true,
  };
  let sequence = 100;
  const Notification = {
    create(fields) {
      const row = { ...fields, _id: id(++sequence), createdAt: new Date() };
      state.notifications.push(row);
      return Promise.resolve(row);
    },
    insertMany(rows) {
      return Promise.all(rows.map((row) => this.create(row)));
    },
    findOneAndUpdate(filter, update) {
      let row;
      if (filter.dedupeKey) {
        row = state.notifications.find(
          (item) => item.dedupeKey === filter.dedupeKey,
        );
        if (!row) {
          row = {
            ...update.$setOnInsert,
            _id: id(++sequence),
            createdAt: new Date(),
          };
          state.notifications.push(row);
        }
      } else {
        row = state.notifications.find(
          (item) =>
            String(item._id) === String(filter._id) &&
            item.channel === "in_app" &&
            filter.pushEvent.$in.includes(item.pushEvent) &&
            item.recipientUserId &&
            !item.pushDelivery?.claimedAt,
        );
        if (row) set(row, update.$set);
      }
      return query(row || null);
    },
    updateOne(filter, update) {
      const row = state.notifications.find(
        (item) => String(item._id) === String(filter._id),
      );
      if (row) set(row, update.$set);
      return Promise.resolve({ modifiedCount: row ? 1 : 0 });
    },
  };
  const matches = (row, filter) =>
    Object.entries(filter).every(
      ([key, value]) => String(row[key]) === String(value),
    );
  const PushSubscription = {
    find(filter) {
      return query(
        state.subscriptions.filter(
          (row) =>
            String(row.userId) === String(filter.userId) &&
            row.isActive &&
            row.sessionExpiresAt > filter.sessionExpiresAt.$gt &&
            row.credentialVersion === filter.credentialVersion &&
            row.activatedAt <= filter.activatedAt.$lte,
        ),
      );
    },
    exists(filter) {
      return Promise.resolve(
        state.subscriptions.some((row) => matches(row, filter)),
      );
    },
    updateOne(filter, update) {
      const row = state.subscriptions.find((item) => matches(item, filter));
      if (row) set(row, update.$set);
      return Promise.resolve({ modifiedCount: row ? 1 : 0 });
    },
  };
  const modules = {
    "server-only": {},
    "@/models/notification": Notification,
    "@/models/PushSubscription": PushSubscription,
    "@/models/user": {
      findOne: (filter) =>
        query(String(filter._id) === user._id && user.isActive ? user : null),
      find: () => query([user]),
    },
    "@/lib/db": {
      connectToDb: async () => {
        state.dbCalls++;
      },
    },
    "@/lib/push-config": {
      getPushConfiguration: () =>
        state.configured
          ? {
              subject: "mailto:test@example.invalid",
              publicKey: "controlled-only",
              privateKey: "controlled-only",
            }
          : null,
    },
    "@/lib/push-subscriptions": { pushStorageReady: async () => state.ready },
    "web-push": {
      sendNotification: async (subscription, payload, options) => {
        if (state.beforeSend) await state.beforeSend(subscription);
        const failure = state.failures.get(subscription.endpoint);
        if (failure) throw failure;
        state.sent.push({ subscription, payload, options });
        return { statusCode: 201 };
      },
    },
  };
  const delivery = f.load("lib/push-delivery.ts", modules);
  const creator = f.load("lib/notification.ts", {
    ...modules,
    "@/lib/push-delivery": {
      ...delivery,
      scheduleNotificationPush: (notificationId) => {
        state.dispatches.push(notificationId);
        delivery.scheduleNotificationPush(notificationId);
      },
    },
  });
  function device(n, extra = {}) {
    const row = {
      _id: id(n),
      userId: user._id,
      endpoint: `https://fcm.googleapis.com/fcm/send/controlled-${n}`,
      keys: {
        p256dh: browserKey,
        auth: Buffer.alloc(16, 7).toString("base64url"),
      },
      isActive: true,
      bindingToken: n.toString(16).padStart(64, "0"),
      credentialVersion: 0,
      activatedAt: new Date(Date.now() - 10000),
      sessionExpiresAt: new Date(Date.now() + 60000),
      expirationTime: null,
      ...extra,
    };
    state.subscriptions.push(row);
    return row;
  }
  function notification(extra = {}) {
    const row = {
      _id: id(++sequence),
      recipientUserId: user._id,
      channel: "in_app",
      pushEvent: "job_assigned",
      type: "job",
      actionUrl: `/technician/all-jobs/${id(9)}`,
      title: "PRIVATE customer OTP/address must never become push content",
      message: "PRIVATE bank account and phone",
      createdAt: new Date(),
      ...extra,
    };
    state.notifications.push(row);
    return row;
  }
  return {
    state,
    user,
    device,
    notification,
    delivery,
    creator,
    f,
    modules,
    id,
  };
}
export const drainPushTasks = async () => {
  for (let n = 0; n < 10; n++)
    await new Promise((resolve) => setImmediate(resolve));
};
