import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { browserFixture } from "./helpers/push-client-fixture.mjs";
import { createFinanceFixture } from "./helpers/finance-fixture.mjs";
async function fixture(options, operation) {
  const f = browserFixture(options);
  try {
    await f.client.synchronizePushOwner(f.state.owner);
    await operation(f);
  } finally {
    f.restore();
  }
}
test("inspection reads real permission and safe metadata without prompting, registering or subscribing", () =>
  fixture({ hasRegistration: false }, async (f) => {
    const state = await f.client.inspectPushDevice(f.state.owner);
    assert.equal(state.permission, "default");
    assert.equal(state.hasSubscription, false);
    assert.equal(f.calls.permission, 0);
    assert.equal(f.calls.register, 0);
    assert.equal(f.calls.subscribe, 0);
    assert.deepEqual(state.devices, []);
  }));
test("explicit enable requests native permission before any configuration fetch and binds only after server registration", () =>
  fixture({ hasRegistration: false }, async (f) => {
    let requested = false;
    const original = Notification.requestPermission;
    Notification.requestPermission = async () => {
      assert.equal(f.calls.requests.length, 0);
      requested = true;
      return original();
    };
    await f.client.enablePushDevice(f.state.owner);
    assert.equal(requested, true);
    assert.equal(f.calls.permission, 1);
    assert.equal(f.calls.register, 1);
    assert.equal(f.calls.subscribe, 1);
    assert.equal(f.state.binding.ownerId, f.state.owner);
    const read = await f.client.inspectPushDevice(f.state.owner);
    assert.equal(read.workerBound, true);
    assert.equal(read.serverDevice.isActive, true);
    assert.equal(read.keyMatches, true);
    assert.ok(
      [...f.storage.values()].every(
        (value) => !value.includes("controlled-binding"),
      ),
    );
  }));
test("denied browser permission never triggers another native prompt or creates a subscription", () =>
  fixture({ permission: "denied", hasRegistration: false }, async (f) => {
    await assert.rejects(
      f.client.enablePushDevice(f.state.owner),
      /permission is blocked/,
    );
    assert.equal(f.calls.permission, 0);
    assert.equal(f.calls.subscribe, 0);
    assert.equal(f.calls.requests.length, 0);
  }));
test("dismissing the app invitation is remembered per account and does not alter permission", () =>
  fixture({}, async (f) => {
    f.client.dismissPushPrompt(f.state.owner);
    assert.equal(f.client.pushPromptDismissed(f.state.owner), true);
    assert.equal(f.client.pushPromptDismissed("b".repeat(24)), false);
    assert.equal(f.state.permission, "default");
    assert.equal(f.calls.permission, 0);
  }));
test("repeated explicit enable reuses a browser subscription and one server device", () =>
  fixture({}, async (f) => {
    await f.client.enablePushDevice(f.state.owner);
    await f.client.enablePushDevice(f.state.owner);
    assert.equal(f.calls.subscribe, 1);
    assert.equal(f.state.rows.length, 1);
    assert.equal(f.calls.permission, 1);
  }));
test("a lost registration response remains unbound until explicit retry recovers the existing subscription", () =>
  fixture({ lostResponse: true }, async (f) => {
    await assert.rejects(
      f.client.enablePushDevice(f.state.owner),
      /could not reach/,
    );
    assert.equal(f.state.binding, null);
    assert.equal(f.state.rows.length, 1);
    await f.client.enablePushDevice(f.state.owner);
    assert.equal(f.state.rows.length, 1);
    assert.equal(f.calls.subscribe, 1);
    assert.equal(f.state.binding.ownerId, f.state.owner);
  }));
test("worker bind failure does not claim success and deactivates its just-created association", () =>
  fixture({ failBind: true }, async (f) => {
    await assert.rejects(
      f.client.enablePushDevice(f.state.owner),
      /could not finish enabling/,
    );
    assert.equal(f.state.native, null);
    assert.equal(f.state.binding, null);
    assert.equal(f.state.rows[0].isActive, false);
  }));
test("rotated account binding or VAPID keys require refresh rather than a false enabled state", () =>
  fixture({}, async (f) => {
    await f.client.enablePushDevice(f.state.owner);
    f.state.token = "controlled-rotated-binding";
    let state = await f.client.inspectPushDevice(f.state.owner);
    assert.equal(state.workerBound, false);
    await f.client.enablePushDevice(f.state.owner);
    assert.equal(
      (await f.client.inspectPushDevice(f.state.owner)).workerBound,
      true,
    );
    f.state.native.options.applicationServerKey = new Uint8Array(65).buffer;
    state = await f.client.inspectPushDevice(f.state.owner);
    assert.equal(state.keyMatches, false);
    const before = f.calls.subscribe;
    await f.client.enablePushDevice(f.state.owner);
    assert.equal(f.calls.subscribe, before + 1);
    assert.equal(
      (await f.client.inspectPushDevice(f.state.owner)).keyMatches,
      true,
    );
  }));
test("switching accounts clears the old browser association without automatically opting in the new owner", () =>
  fixture({}, async (f) => {
    await f.client.enablePushDevice(f.state.owner);
    const old = f.state.native;
    f.state.owner = "b".repeat(24);
    await f.client.synchronizePushOwner(f.state.owner);
    assert.equal(f.state.binding, null);
    assert.equal(f.state.native, null);
    assert.equal(f.calls.subscribe, 1);
    assert.equal(
      (await f.client.inspectPushDevice(f.state.owner)).serverDevice,
      null,
    );
    await f.client.enablePushDevice(f.state.owner);
    assert.notEqual(f.state.native.endpoint, old.endpoint);
    assert.equal(f.state.binding.ownerId, f.state.owner);
  }));
test("disabling this device and removing another device do not delete unrelated devices", () =>
  fixture({}, async (f) => {
    await f.client.enablePushDevice(f.state.owner);
    f.state.rows.push({
      id: "d".repeat(24),
      owner: f.state.owner,
      deviceLabel: "Other controlled device",
      endpoint: "https://push.example.invalid/other",
      isActive: true,
    });
    await f.client.removePushDevice(f.state.owner, "d".repeat(24));
    assert.equal(f.state.native !== null, true);
    assert.equal(f.state.rows[0].isActive, true);
    assert.equal(f.state.rows[1].isActive, false);
    await f.client.disablePushDevice(f.state.owner, f.state.rows[0].id);
    assert.equal(f.state.native, null);
    assert.equal(f.state.rows[0].isActive, false);
    assert.equal(f.state.rows.length, 2);
  }));
test("logout preserves NextAuth options even when notification cleanup cannot reach the server", () =>
  fixture({}, async (f) => {
    await f.client.enablePushDevice(f.state.owner);
    f.state.failNetwork = true;
    const options = { redirect: false, callbackUrl: "/signin" };
    await f.client.signOut(options);
    assert.deepEqual(f.calls.signOut, [options]);
    assert.equal(f.state.binding, null);
    assert.equal(f.state.native, null);
  }));
test("missing VAPID setup fails safely without changing browser registration", () =>
  fixture(
    { configured: false, permission: "granted", hasRegistration: false },
    async (f) => {
      await assert.rejects(
        f.client.enablePushDevice(f.state.owner),
        /need server setup/,
      );
      assert.equal(f.calls.register, 0);
      assert.equal(f.calls.subscribe, 0);
      assert.equal(f.calls.permission, 0);
    },
  ));
test("an unrelated root worker is never overwritten or unregistered", () =>
  fixture({ hasRegistration: false, permission: "granted" }, async (f) => {
    f.state.hasRegistration = true;
    f.registration.active.scriptURL = "http://localhost:3000/other-worker.js";
    await assert.rejects(
      f.client.enablePushDevice(f.state.owner),
      /Another website worker/,
    );
    assert.equal(f.calls.register, 0);
    assert.equal(f.calls.subscribe, 0);
    await f.client.signOut({ redirect: false });
    assert.equal(f.calls.signOut.length, 1);
  }));
test("an old account registration completing late cannot bind or unsubscribe the new account device", () =>
  fixture({}, async (f) => {
    const original = globalThis.fetch;
    let release, started;
    const held = new Promise((resolve) => (release = resolve)),
      ready = new Promise((resolve) => (started = resolve));
    let first = true;
    globalThis.fetch = async (path, input) => {
      const response = await original(path, input);
      if (
        first &&
        path.endsWith("/subscriptions") &&
        input?.method === "POST"
      ) {
        first = false;
        started();
        await held;
      }
      return response;
    };
    const previous = f.client.enablePushDevice(f.state.owner);
    await ready;
    f.state.owner = "b".repeat(24);
    await f.client.synchronizePushOwner(f.state.owner);
    await f.client.enablePushDevice(f.state.owner);
    const nextEndpoint = f.state.native.endpoint;
    release();
    await assert.rejects(previous, /account changed/);
    assert.equal(f.state.binding.ownerId, f.state.owner);
    assert.equal(f.state.native.endpoint, nextEndpoint);
  }));
test("settings distinguish blocked/unsupported states and expose no endpoint or subscription keys", () => {
  for (const [permission, supported, title] of [
    ["denied", true, "Browser permission blocked"],
    ["unsupported", false, "Unsupported browser or device"],
  ]) {
    const f = createFinanceFixture(),
      state = {
        facts: { supported, secureContext: true, permission },
        snapshot: {
          config: { configured: true, storageReady: true },
          hasSubscription: false,
          serverDevice: null,
          workerBound: false,
          keyMatches: null,
          devices: [
            {
              id: "a".repeat(24),
              deviceLabel: "Controlled browser",
              isActive: true,
            },
          ],
        },
        authenticated: true,
        loading: false,
        busy: false,
        error: "",
        feedback: "",
        enabled: false,
        refresh() {},
        enable() {},
        disable() {},
        removeDevice() {},
      };
    const { PushNotificationSettings } = f.load(
      "components/notifications/PushNotificationSettings.tsx",
      { "@/hooks/useWebPush": { useWebPush: () => state } },
    );
    const html = renderToStaticMarkup(
      React.createElement(PushNotificationSettings),
    );
    assert.match(html, new RegExp(title));
    assert.match(html, /Controlled browser/);
    assert.doesNotMatch(
      html,
      /p256dh|bindingToken|endpoint|controlled-auth-secret/,
    );
    assert.match(html, /id="push-settings"/);
  }
});
