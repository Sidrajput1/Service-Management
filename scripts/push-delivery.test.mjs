import test from "node:test";
import assert from "node:assert/strict";
import { pushEnvelope, safePushPath } from "../lib/push-policy.mjs";
import {
  deliveryFixture,
  drainPushTasks,
} from "./helpers/push-delivery-fixture.mjs";

test("one saved notification reaches every eligible device once with a minimal private payload", async () => {
  const f = deliveryFixture(),
    first = f.device(2),
    second = f.device(3),
    row = f.notification();
  const result = await f.delivery.deliverNotificationPush(row._id);
  assert.equal(result.sent, 2);
  assert.equal(f.state.sent.length, 2);
  for (const request of f.state.sent) {
    const payload = JSON.parse(request.payload);
    assert.deepEqual(Object.keys(payload), [
      "v",
      "notificationId",
      "subscriptionId",
      "bindingToken",
    ]);
    assert.equal(payload.notificationId, row._id);
    assert.doesNotMatch(
      request.payload,
      /PRIVATE|OTP|address|phone|bank|title|message|actionUrl/,
    );
    assert.equal(request.options.TTL, 120);
  }
  assert.deepEqual(
    f.state.sent.map((item) => item.subscription.endpoint),
    [first.endpoint, second.endpoint],
  );
  await f.delivery.deliverNotificationPush(row._id);
  assert.equal(f.state.sent.length, 2);
});
test("parallel deliveries and repeated creation of the same deduped event do not resend it", async () => {
  const f = deliveryFixture();
  f.device(2);
  const input = {
    recipientUserId: f.user._id,
    type: "job",
    title: "Job assigned",
    message: "Private in-app body",
    pushEvent: "job_assigned",
    dedupeKey: "actual-assignment-event",
  };
  const [a, b] = await Promise.all([
    f.creator.createNotification(input),
    f.creator.createNotification(input),
  ]);
  await drainPushTasks();
  assert.equal(a._id, b._id);
  assert.equal(f.state.notifications.length, 1);
  assert.equal(f.state.sent.length, 1);
  await Promise.all([
    f.delivery.deliverNotificationPush(a._id),
    f.delivery.deliverNotificationPush(a._id),
  ]);
  assert.equal(f.state.sent.length, 1);
});
test("routine, manually authored and role-only notifications do not automatically become pushes", async () => {
  const f = deliveryFixture();
  f.device(2);
  for (const extra of [
    { pushEvent: undefined },
    { channel: "email" },
    { recipientUserId: undefined, recipientRole: "admin" },
  ])
    await f.delivery.deliverNotificationPush(f.notification(extra)._id);
  await f.creator.createNotification({
    recipientUserId: f.user._id,
    type: "system",
    title: "Staff note",
    message: "Keep in-app",
  });
  await drainPushTasks();
  assert.equal(f.state.sent.length, 0);
});
test("missing configuration or indexes cannot break in-app creation and does not consume the push claim", async () => {
  for (const field of ["configured", "ready"]) {
    const f = deliveryFixture();
    f.state[field] = false;
    f.device(2);
    const row = await f.creator.createNotification({
      recipientUserId: f.user._id,
      type: "job",
      title: "Saved",
      message: "Saved in-app",
      pushEvent: "job_assigned",
    });
    await drainPushTasks();
    assert.ok(row._id);
    assert.equal(f.state.notifications.length, 1);
    assert.equal(row.pushDelivery, undefined);
    assert.equal(f.state.sent.length, 0);
  }
});
test("404 and 410 deactivate only that exact association; transient errors leave devices active", async () => {
  const f = deliveryFixture(),
    gone = f.device(2),
    missing = f.device(3),
    temporary = f.device(4),
    good = f.device(5);
  f.state.failures.set(gone.endpoint, { statusCode: 410 });
  f.state.failures.set(missing.endpoint, { statusCode: 404 });
  f.state.failures.set(temporary.endpoint, { statusCode: 503 });
  const result = await f.delivery.deliverNotificationPush(f.notification()._id);
  assert.deepEqual(result, { sent: 1, inactive: 2, failed: 1, skipped: 0 });
  assert.equal(gone.isActive, false);
  assert.equal(missing.isActive, false);
  assert.equal(temporary.isActive, true);
  assert.equal(good.isActive, true);
});
test("an old failing send cannot deactivate a subscription reassociated during the request", async () => {
  const f = deliveryFixture(),
    device = f.device(2);
  f.state.beforeSend = async () => {
    device.userId = f.id(99);
    device.bindingToken = "a".repeat(64);
  };
  f.state.failures.set(device.endpoint, { statusCode: 410 });
  await f.delivery.deliverNotificationPush(f.notification()._id);
  assert.equal(device.isActive, true);
});
test("expired, disabled, wrong-account, credential-stale and newly opted-in devices are excluded", async () => {
  const f = deliveryFixture();
  f.device(2, { sessionExpiresAt: new Date(0) });
  f.device(3, { isActive: false });
  f.device(4, { userId: f.id(99) });
  f.device(5, { credentialVersion: 10 });
  f.device(6, { activatedAt: new Date(Date.now() + 1000) });
  const expired = f.device(7, { expirationTime: new Date(0) });
  const result = await f.delivery.deliverNotificationPush(f.notification()._id);
  assert.equal(f.state.sent.length, 0);
  assert.equal(expired.isActive, false);
  assert.equal(result.inactive, 1);
});
test("invalid stored endpoints and keys never reach the outbound library", async () => {
  const f = deliveryFixture();
  f.device(2, { endpoint: "https://127.0.0.1/private" });
  f.device(3, { keys: { p256dh: "invalid", auth: "invalid" } });
  const result = await f.delivery.deliverNotificationPush(f.notification()._id);
  assert.equal(f.state.sent.length, 0);
  assert.equal(result.skipped, 2);
});
test("inactive or password-reset accounts do not receive pushes", async () => {
  for (const change of [{ isActive: false }, { mustChangePassword: true }]) {
    const f = deliveryFixture();
    Object.assign(f.user, change);
    f.device(2);
    await f.delivery.deliverNotificationPush(f.notification()._id);
    assert.equal(f.state.sent.length, 0);
  }
});
test("trusted existing assignment, payment, completion and booking helpers mark and dedupe their events", async () => {
  const f = deliveryFixture(),
    events = f.f.load("lib/notify-events.ts", {
      "@/lib/notification": f.creator,
    });
  f.device(2);
  const assignment = {
    technicianUserId: f.user._id,
    jobId: f.id(9),
    bookingId: f.id(10),
    notificationKey: "committed-assignment-v1",
  };
  await events.notifyJobAssigned(assignment);
  await events.notifyJobAssigned(assignment);
  await drainPushTasks();
  assert.equal(f.state.notifications.length, 1);
  assert.equal(f.state.sent.length, 1);
  await events.notifyJobAssigned({
    ...assignment,
    notificationKey: "committed-assignment-v2",
  });
  await drainPushTasks();
  assert.equal(f.state.sent.length, 2);
  const payment = {
    customerUserId: f.user._id,
    invoiceId: f.id(11),
    invoiceNumber: "CONTROLLED",
    paymentId: f.id(12),
    amount: 100,
  };
  await events.notifyPaymentReceived(payment);
  await events.notifyPaymentReceived(payment);
  await drainPushTasks();
  assert.equal(
    f.state.notifications.filter((row) => row.pushEvent === "payment_verified")
      .length,
    1,
  );
  const provider = deliveryFixture();
  const providerEvents = provider.f.load("lib/notify-events.ts", {
    "@/lib/notification": provider.creator,
  });
  await providerEvents.notifyPaymentReceived({
    ...payment,
    customerUserId: undefined,
    providerUserId: provider.user._id,
  });
  await drainPushTasks();
  assert.equal(
    provider.state.notifications[0].actionUrl,
    "/service-provider/finance/payments",
  );
});
test("the envelope rejects malformed references and safe destinations stay in the recipient workspace", () => {
  assert.throws(() => pushEnvelope("bad", "b".repeat(24), "a".repeat(64)));
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/customer/../admin/finance",
    "/customer/%2e%2e/admin",
    "/admin/finance",
    "/customer/\\evil",
  ])
    assert.equal(safePushPath(value, "customer"), "/notifications");
  assert.equal(
    safePushPath(
      "/customer/bookings/" + "a".repeat(24) + "?redirect=https://evil.example",
      "customer",
    ),
    "/customer/bookings/" + "a".repeat(24),
  );
});

test("role fan-out reuses the same existing notification and recipient-specific dedupe key", async () => {
  const f = deliveryFixture();
  f.device(2);
  const input = {
    title: "Controlled assignment",
    message: "In-app only body",
    type: "job",
    pushEvent: "job_assigned",
    dedupeKey: "committed-role-event",
  };
  await f.creator.createNotificationForRole("technician", input);
  await f.creator.createNotificationForRole("technician", input);
  await drainPushTasks();
  assert.equal(f.state.notifications.length, 1);
  assert.equal(
    f.state.notifications[0].dedupeKey,
    "committed-role-event:" + f.user._id,
  );
  assert.equal(f.state.sent.length, 1);
});
