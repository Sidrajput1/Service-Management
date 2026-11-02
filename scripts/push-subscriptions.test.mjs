import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  createPushFixture,
  controlledKeys,
  installControlledVapid,
} from "./helpers/push-subscription-fixture.mjs";
const base = "/api/notifications/push";
const input = (n = 1) => ({
  subscription: {
    endpoint: `https://fcm.googleapis.com/fcm/send/controlled_${n}`,
    expirationTime: null,
    keys: controlledKeys(n),
  },
  deviceLabel: "Controlled browser",
});
async function register(f, n = 1) {
  const route = f.load("app/api/notifications/push/subscriptions/route.ts"),
    response = await route.POST(f.request(base + "/subscriptions", input(n)));
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
test("push configuration fails closed for missing, malformed and mismatched VAPID data without exposing values", () => {
  const restore = installControlledVapid();
  try {
    const service = createPushFixture().load("lib/push-config.ts");
    assert.ok(service.getPushConfiguration());
    const pub = process.env.VAPID_PUBLIC_KEY;
    process.env.VAPID_PUBLIC_KEY = "bad";
    assert.equal(service.getPushConfiguration(), null);
    process.env.VAPID_PUBLIC_KEY = pub;
    process.env.VAPID_SUBJECT = "javascript:alert(1)";
    assert.equal(service.getPushConfiguration(), null);
  } finally {
    restore();
  }
});
test("actual subscription model hides operational secrets and declares explicit indexes without auto-creation", () => {
  const f = createPushFixture(),
    model = f.load("models/PushSubscription.ts", { mongoose }).default;
  assert.equal(model.schema.options.autoCreate, false);
  assert.equal(model.schema.options.autoIndex, false);
  assert.ok(
    model.schema
      .indexes()
      .some(([key, opts]) => key.endpoint === 1 && opts.unique),
  );
  const row = new model({
    userId: f.oid(1),
    endpoint: input().subscription.endpoint,
    keys: controlledKeys(),
    deviceLabel: "Test",
    isActive: true,
    bindingToken: "b".repeat(43),
    sessionHash: "a".repeat(64),
    sessionExpiresAt: new Date(),
    activatedAt: new Date(),
    lastSeenAt: new Date(),
  });
  const dto = row.toJSON();
  for (const key of [
    "endpoint",
    "keys",
    "bindingToken",
    "sessionHash",
    "sessionExpiresAt",
    "expirationTime",
    "credentialVersion",
    "activatedAt",
  ])
    assert.equal(dto[key], undefined, key);
});
test("all management APIs require authentication before listing, configuration or mutation", async () => {
  const f = createPushFixture();
  for (const [path, method] of [
    ["config", "GET"],
    ["subscriptions", "GET"],
    ["subscriptions", "POST"],
    ["subscriptions/current", "POST"],
    ["resolve", "POST"],
    ["subscriptions/" + f.oid(5), "DELETE"],
  ]) {
    const route = f.load(
      "app/api/notifications/push/" +
        (path.startsWith("subscriptions/") && !path.endsWith("current")
          ? "subscriptions/[id]"
          : path) +
        "/route.ts",
    );
    const response = await route[method](
      f.request(base + "/" + path, method === "GET" ? null : {}, method),
      { params: Promise.resolve({ id: String(f.oid(5)) }) },
    );
    assert.equal(response.status, 401, path);
  }
  assert.equal(f.state.subscriptions.length, 0);
});
test("registration derives ownership from the session, validates strict input and rejects cross-origin writes", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const route = f.load("app/api/notifications/push/subscriptions/route.ts");
    for (const body of [
      { ...input(), userId: String(f.oid(2)) },
      {
        ...input(),
        subscription: {
          ...input().subscription,
          keys: { ...controlledKeys(), extra: "forged" },
        },
      },
    ])
      assert.equal(
        (await route.POST(f.request(base + "/subscriptions", body))).status,
        400,
      );
    assert.equal(
      (
        await route.POST(
          f.request(base + "/subscriptions", input(), "POST", {
            origin: "https://foreign.invalid",
          }),
        )
      ).status,
      403,
    );
    assert.equal(f.state.subscriptions.length, 0);
  } finally {
    restore();
  }
});
test("endpoint validation blocks arbitrary POST targets and invalid key material", () => {
  const service = createPushFixture().load("lib/push-security.ts");
  for (const endpoint of [
    "http://fcm.googleapis.com/a",
    "https://127.0.0.1/a",
    "https://internal.invalid/a",
    "https://fcm.googleapis.com.evil.invalid/a",
    "https://fcm.googleapis.com:444/a",
    "https://user@fcm.googleapis.com/a",
    "https://fcm.googleapis.com/a#fragment",
  ])
    assert.equal(
      service.registerPushSchema.safeParse({
        subscription: { endpoint, keys: controlledKeys() },
      }).success,
      false,
      endpoint,
    );
  assert.equal(
    service.registerPushSchema.safeParse({
      subscription: {
        endpoint: input().subscription.endpoint,
        keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
      },
    }).success,
    false,
  );
  assert.equal(service.registerPushSchema.safeParse(input()).success, true);
});
test("identical endpoint registration is idempotent and a user can register multiple devices", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const one = await register(f),
      again = await register(f);
    assert.equal(one.device.id, again.device.id);
    assert.equal(one.binding.bindingToken, again.binding.bindingToken);
    await register(f, 2);
    assert.equal(f.state.subscriptions.length, 2);
    assert.equal(f.state.subscriptions.filter((row) => row.isActive).length, 2);
    const route = f.load("app/api/notifications/push/subscriptions/route.ts"),
      response = await route.GET(),
      body = await response.json();
    assert.equal(body.devices.length, 2);
    assert.doesNotMatch(
      JSON.stringify(body),
      /fcm\.googleapis|p256dh|bindingToken|sessionHash|"auth"/,
    );
  } finally {
    restore();
  }
});
test("concurrent retries preserve one subscription per endpoint and one binding", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const result = await Promise.all([register(f), register(f)]);
    assert.equal(
      result[0].binding.bindingToken,
      result[1].binding.bindingToken,
    );
    assert.equal(f.state.subscriptions.length, 1);
  } finally {
    restore();
  }
});
test("another account can reassociate only the browser key proof; former owner loses management and resolution", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const old = await register(f);
    f.login(1, "b".repeat(64));
    const route = f.load("app/api/notifications/push/subscriptions/route.ts");
    const wrong = {
      ...input(),
      subscription: { ...input().subscription, keys: controlledKeys(3) },
    };
    assert.equal(
      (await route.POST(f.request(base + "/subscriptions", wrong))).status,
      409,
    );
    const updated = await register(f);
    assert.equal(old.device.id, updated.device.id);
    assert.notEqual(old.binding.bindingToken, updated.binding.bindingToken);
    assert.equal(f.state.subscriptions.length, 1);
    f.login();
    const remove = f.load(
      "app/api/notifications/push/subscriptions/[id]/route.ts",
    );
    assert.equal(
      (
        await remove.DELETE(
          f.request(base + "/subscriptions/" + old.device.id, {}, "DELETE"),
          { params: Promise.resolve({ id: old.device.id }) },
        )
      ).status,
      404,
    );
    const current = f.load(
      "app/api/notifications/push/subscriptions/current/route.ts",
    );
    assert.deepEqual(
      await (
        await current.POST(
          f.request(base + "/subscriptions/current", {
            endpoint: input().subscription.endpoint,
          }),
        )
      ).json(),
      { device: null, binding: null },
    );
  } finally {
    restore();
  }
});
test("same account with a new login rotates its association; session-specific logout does not remove another device", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const oldToken = { ...f.state.token },
      first = await register(f);
    await register(f, 2);
    f.login(0, "b".repeat(64));
    const current = await register(f);
    assert.notEqual(first.binding.bindingToken, current.binding.bindingToken);
    await f.load("lib/push-session.ts").deactivatePushSession(oldToken);
    assert.equal(
      f.state.subscriptions.find((row) => String(row._id) === first.device.id)
        .isActive,
      true,
    );
    assert.equal(
      f.state.subscriptions.find(
        (row) => row.endpoint === input(2).subscription.endpoint,
      ).isActive,
      false,
    );
  } finally {
    restore();
  }
});
test("removing an individual owned subscription is idempotent and leaves other devices active", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const first = await register(f);
    await register(f, 2);
    const route = f.load(
      "app/api/notifications/push/subscriptions/[id]/route.ts",
    );
    for (let n = 0; n < 2; n++)
      assert.equal(
        (
          await route.DELETE(
            f.request(base + "/subscriptions/" + first.device.id, {}, "DELETE"),
            { params: Promise.resolve({ id: first.device.id }) },
          )
        ).status,
        200,
      );
    assert.equal(f.state.subscriptions.filter((row) => row.isActive).length, 1);
  } finally {
    restore();
  }
});
test("missing storage/configuration disables only push registration and never creates plaintext or unsafe rows", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    f.state.ready = false;
    const config = f.load("app/api/notifications/push/config/route.ts");
    const status = await (await config.GET()).json();
    assert.equal(status.storageReady, false);
    assert.equal(status.configured, true);
    assert.doesNotMatch(JSON.stringify(status), /privateKey|subject/);
    assert.equal(
      (
        await f
          .load("app/api/notifications/push/subscriptions/route.ts")
          .POST(f.request(base + "/subscriptions", input()))
      ).status,
      503,
    );
    f.state.ready = true;
    delete process.env.VAPID_PRIVATE_KEY;
    assert.equal(
      (
        await f
          .load("app/api/notifications/push/subscriptions/route.ts")
          .POST(f.request(base + "/subscriptions", input()))
      ).status,
      503,
    );
    assert.equal(f.state.subscriptions.length, 0);
  } finally {
    restore();
  }
});
test("oversized, invalid session, expired and forged association requests fail safely", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const route = f.load("app/api/notifications/push/subscriptions/route.ts");
    assert.equal(
      (
        await route.POST(
          f.request(base + "/subscriptions", {
            ...input(),
            deviceLabel: "x".repeat(5000),
          }),
        )
      ).status,
      413,
    );
    f.state.token.pushSessionId = "bad";
    assert.equal(
      (await route.POST(f.request(base + "/subscriptions", input()))).status,
      401,
    );
    f.login();
    assert.equal(
      (
        await route.POST(
          f.request(base + "/subscriptions", {
            ...input(),
            subscription: {
              ...input().subscription,
              expirationTime: Date.now() - 1,
            },
          }),
        )
      ).status,
      409,
    );
  } finally {
    restore();
  }
});
test("device limit is enforced inside a transaction rather than by a racy client-side count", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    for (let n = 1; n <= 20; n++) await register(f, n);
    const route = f.load("app/api/notifications/push/subscriptions/route.ts"),
      response = await route.POST(
        f.request(base + "/subscriptions", input(21)),
      );
    assert.equal(response.status, 409);
    assert.equal(
      f.state.subscriptions.filter((row) => row.isActive).length,
      20,
    );
  } finally {
    restore();
  }
});

test("resolver returns only a generic body and safe same-role path for a current owned association", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const registered = await register(f),
      notificationId = String(f.oid(500)),
      route = f.load("app/api/notifications/push/resolve/route.ts");
    f.state.notifications.push({
      _id: f.oid(500),
      recipientUserId: f.state.actor._id,
      channel: "in_app",
      pushEvent: "booking_accepted",
      title: "Secret title",
      message: "OTP 123456 and private bank/address information",
      metadata: { phone: "private" },
      actionUrl: "/customer/bookings/" + f.oid(501),
    });
    const body = {
      notificationId,
      subscriptionId: registered.device.id,
      bindingToken: registered.binding.bindingToken,
    };
    let response = await route.POST(f.request(base + "/resolve", body)),
      value = await response.json();
    assert.equal(response.status, 200);
    assert.equal(value.url, "/customer/bookings/" + f.oid(501));
    assert.equal(value.title, "Servizato");
    assert.equal(value.body, "Open your account to review an update.");
    assert.doesNotMatch(
      JSON.stringify(value),
      /Secret title|123456|private|phone|metadata/,
    );
    for (const url of [
      "https://foreign.invalid/",
      "//foreign.invalid/",
      "/technician/all-jobs/" + f.oid(501),
      "/customer/%2e%2e/admin",
    ]) {
      f.state.notifications[0].actionUrl = url;
      value = await (
        await route.POST(f.request(base + "/resolve", body))
      ).json();
      assert.equal(value.url, "/notifications");
    }
  } finally {
    restore();
  }
});
test("resolver rejects foreign notifications, stale/disabled devices, wrong binding and expired sessions", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const registered = await register(f),
      route = f.load("app/api/notifications/push/resolve/route.ts"),
      body = {
        notificationId: String(f.oid(500)),
        subscriptionId: registered.device.id,
        bindingToken: registered.binding.bindingToken,
      };
    f.state.notifications.push({
      _id: f.oid(500),
      recipientUserId: f.oid(2),
      channel: "in_app",
      pushEvent: "job_assigned",
      actionUrl: "/notifications",
    });
    assert.equal(
      (await route.POST(f.request(base + "/resolve", body))).status,
      404,
    );
    f.state.notifications[0].recipientUserId = f.state.actor._id;
    assert.equal(
      (
        await route.POST(
          f.request(base + "/resolve", {
            ...body,
            bindingToken: "f".repeat(64),
          }),
        )
      ).status,
      404,
    );
    f.state.subscriptions[0].isActive = false;
    assert.equal(
      (await route.POST(f.request(base + "/resolve", body))).status,
      404,
    );
    f.state.subscriptions[0].isActive = true;
    f.state.subscriptions[0].sessionExpiresAt = new Date(Date.now() - 1);
    assert.equal(
      (await route.POST(f.request(base + "/resolve", body))).status,
      404,
    );
  } finally {
    restore();
  }
});
test("a delivery reference without an explicit trusted push event is never resolved", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const registered = await register(f),
      route = f.load("app/api/notifications/push/resolve/route.ts"),
      body = {
        notificationId: String(f.oid(500)),
        subscriptionId: registered.device.id,
        bindingToken: registered.binding.bindingToken,
      };
    f.state.notifications.push({
      _id: f.oid(500),
      recipientUserId: f.state.actor._id,
      channel: "in_app",
      title: "Arbitrary staff-created message",
      actionUrl: "/notifications",
    });
    assert.equal(
      (await route.POST(f.request(base + "/resolve", body))).status,
      404,
    );
    f.state.notifications[0].pushEvent = "invented_event";
    assert.equal(
      (await route.POST(f.request(base + "/resolve", body))).status,
      404,
    );
  } finally {
    restore();
  }
});
test("current-device lookup requires the present login association and never returns secret subscription fields", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const registered = await register(f),
      route = f.load(
        "app/api/notifications/push/subscriptions/current/route.ts",
      );
    let value = await (
      await route.POST(
        f.request(base + "/subscriptions/current", {
          endpoint: input().subscription.endpoint,
        }),
      )
    ).json();
    assert.equal(value.device.id, registered.device.id);
    assert.equal(value.binding.bindingToken.length, 64);
    assert.doesNotMatch(
      JSON.stringify(value),
      /p256dh|fcm\.googleapis|sessionHash|"auth"/,
    );
    f.login(0, "b".repeat(64));
    value = await (
      await route.POST(
        f.request(base + "/subscriptions/current", {
          endpoint: input().subscription.endpoint,
        }),
      )
    ).json();
    assert.deepEqual(value, { device: null, binding: null });
  } finally {
    restore();
  }
});
test("logout cleanup failures never reject the authentication logout event", async () => {
  const restore = installControlledVapid(),
    original = console.error;
  try {
    const f = createPushFixture();
    f.login();
    await register(f);
    f.state.failCleanup = true;
    const logs = [];
    console.error = (message) => logs.push(message);
    await assert.doesNotReject(
      f.load("lib/push-session.ts").deactivatePushSession(f.state.token),
    );
    assert.equal(logs.length, 1);
    assert.doesNotMatch(logs[0], /fcm\.googleapis|p256dh|controlled_1/);
  } finally {
    console.error = original;
    restore();
  }
});
test("readiness requires the endpoint unique index and existing notification dedupe index", async () => {
  const f = createPushFixture();
  f.login();
  const service = f.load("lib/push-subscriptions.ts");
  assert.equal(await service.pushStorageReady(), true);
  f.indexes.notifications[0].unique = false;
  assert.equal(await service.pushStorageReady(), false);
  f.indexes.notifications[0].unique = true;
  f.indexes.pushsubscriptions[0].unique = false;
  assert.equal(await service.pushStorageReady(), false);
});
test("request rate limiting is bounded per user and a new time window permits retry", () => {
  const service = createPushFixture().load("lib/push-security.ts");
  for (let n = 0; n < 30; n++)
    service.limitPushRequests("rate-fixture", "write", 1000);
  assert.throws(
    () => service.limitPushRequests("rate-fixture", "write", 1000),
    (error) => error.status === 429,
  );
  assert.doesNotThrow(() =>
    service.limitPushRequests("other-fixture", "write", 1000),
  );
  assert.doesNotThrow(() =>
    service.limitPushRequests("rate-fixture", "write", 62000),
  );
});

test("NextAuth assigns a private login binding, preserves it on refresh, and excludes it from the public session", async () => {
  const f = createPushFixture(),
    user = f.login(),
    options = f.load("lib/auth-options.ts").authOptions;
  const first = await options.callbacks.jwt({
    token: { exp: Math.floor(Date.now() / 1000) + 86400 },
    user: {
      id: String(user._id),
      role: user.role,
      email: "controlled@example.invalid",
      name: "Controlled user",
      phone: null,
    },
  });
  assert.match(first.pushSessionId, /^[a-f\d]{64}$/);
  const refreshed = await options.callbacks.jwt({ token: { ...first } });
  assert.equal(refreshed.pushSessionId, first.pushSessionId);
  const nextLogin = await options.callbacks.jwt({
    token: {},
    user: { id: String(user._id), role: user.role, phone: null },
  });
  assert.notEqual(nextLogin.pushSessionId, first.pushSessionId);
  const session = await options.callbacks.session({
    session: { user: {} },
    token: first,
  });
  assert.equal(session.user.id, String(user._id));
  assert.equal(session.user.pushSessionId, undefined);
  assert.equal(session.pushSessionId, undefined);
  f.state.token = first;
  const restore = installControlledVapid();
  try {
    await register(f);
    await options.events.signOut({ token: first });
    assert.equal(f.state.subscriptions[0].isActive, false);
  } finally {
    restore();
  }
});

test("stale automatic cleanup cannot disable a newly rebound association for the same account", async () => {
  const restore = installControlledVapid();
  try {
    const f = createPushFixture();
    f.login();
    const first = await register(f);
    f.login(0, "b".repeat(64));
    const next = await register(f);
    assert.notEqual(first.binding.bindingToken, next.binding.bindingToken);
    const route = f.load(
        "app/api/notifications/push/subscriptions/[id]/route.ts",
      ),
      params = { params: Promise.resolve({ id: first.device.id }) };
    const stale = await route.DELETE(
      f.request(base + "/subscriptions/" + first.device.id, {}, "DELETE", {
        "x-servizato-push-binding": first.binding.bindingToken,
      }),
      params,
    );
    assert.equal(stale.status, 404);
    assert.equal(f.state.subscriptions[0].isActive, true);
    assert.equal(
      (
        await route.DELETE(
          f.request(base + "/subscriptions/" + first.device.id, {}, "DELETE", {
            "x-servizato-push-binding": "malformed",
          }),
          params,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await route.DELETE(
          f.request(base + "/subscriptions/" + next.device.id, {}, "DELETE", {
            "x-servizato-push-binding": next.binding.bindingToken,
          }),
          params,
        )
      ).status,
      200,
    );
    assert.equal(f.state.subscriptions[0].isActive, false);
  } finally {
    restore();
  }
});

test("shared push index definitions match model exports and retain unique/partial requirements", async () => {
  const { pushIndexDefinitions, matchesPushIndex } = await import(
    "../lib/push-indexes.mjs"
  );
  const model = createPushFixture().load("models/PushSubscription.ts", {
    mongoose,
  });
  assert.deepEqual(model.pushIndexDefinitions, pushIndexDefinitions);
  assert.equal(pushIndexDefinitions.length, 3);
  assert.equal(
    matchesPushIndex(
      [{ key: { endpoint: 1 }, unique: true }],
      { endpoint: 1 },
      { unique: true },
    ),
    true,
  );
  assert.equal(
    matchesPushIndex(
      [{ key: { endpoint: 1 }, unique: false }],
      { endpoint: 1 },
      { unique: true },
    ),
    false,
  );
  assert.equal(
    matchesPushIndex(
      [{ key: { dedupeKey: 1 }, unique: true }],
      { dedupeKey: 1 },
      {
        unique: true,
        partialFilterExpression: { dedupeKey: { $type: "string" } },
      },
    ),
    false,
  );
  assert.equal(
    matchesPushIndex(
      [
        {
          key: { dedupeKey: 1 },
          unique: true,
          partialFilterExpression: { dedupeKey: { $type: "string" } },
        },
      ],
      { dedupeKey: 1 },
      {
        unique: true,
        partialFilterExpression: { dedupeKey: { $type: "string" } },
      },
    ),
    true,
  );
});

test("an accidentally unique user/isActive lookup index is not accepted as multi-device readiness", async () => {
  const { matchesPushIndex } = await import("../lib/push-indexes.mjs");
  assert.equal(
    matchesPushIndex(
      [{ key: { userId: 1, isActive: 1 }, unique: true }],
      { userId: 1, isActive: 1 },
      {},
    ),
    false,
  );
  const f = createPushFixture();
  f.indexes.pushsubscriptions[1].unique = true;
  assert.equal(
    await f.load("lib/push-subscriptions.ts").pushStorageReady(),
    false,
  );
});
