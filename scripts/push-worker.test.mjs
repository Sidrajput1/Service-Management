import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../public/servizato-push-sw.js", import.meta.url),
  "utf8",
);
const id = (n) => n.toString(16).padStart(24, "0");
const binding = {
  subscriptionId: id(1),
  bindingToken: "a".repeat(64),
  ownerId: id(2),
};
const payload = (n = 3, owner = binding) => ({
  v: 1,
  notificationId: id(n),
  subscriptionId: owner.subscriptionId,
  bindingToken: owner.bindingToken,
});
const result = (data, overrides = {}) => ({
  ok: true,
  json: async () => ({
    title: "Servizato",
    body: "Open your account to review an update.",
    url: `/customer/bookings/${id(9)}`,
    tag: `servizato-${data.notificationId}`,
    ...overrides,
  }),
});
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture(options = {}) {
  const handlers = new Map(),
    memory = new Map(),
    shown = [],
    requests = [],
    opened = [],
    navigation = [];
  const state = {
    failStorage: false,
    failWrite: false,
    existing: [],
    ...options,
  };
  let storeCreated = false;
  const db = {
    objectStoreNames: { contains: () => storeCreated },
    createObjectStore() {
      storeCreated = true;
    },
    close() {},
    transaction(_name, mode) {
      const transaction = {},
        changes = [];
      transaction.objectStore = () => ({
        get(key) {
          const request = {};
          queueMicrotask(() => {
            request.result = structuredClone(memory.get(key));
            request.onsuccess?.();
          });
          return request;
        },
        put(value, key) {
          changes.push([key, structuredClone(value)]);
          return {};
        },
      });
      setImmediate(() => {
        if (state.failStorage || (mode === "readwrite" && state.failWrite)) {
          transaction.onerror?.();
          return;
        }
        for (const [key, value] of changes) memory.set(key, value);
        transaction.oncomplete?.();
      });
      return transaction;
    },
  };
  const indexedDB = {
    open() {
      const request = { result: db };
      queueMicrotask(() => {
        if (state.failStorage) request.onerror?.();
        else {
          if (!storeCreated) request.onupgradeneeded?.();
          request.onsuccess?.();
        }
      });
      return request;
    },
  };
  const self = {
    location: { origin: "https://servizato.example" },
    addEventListener: (name, handler) => handlers.set(name, handler),
    registration: {
      async getNotifications() {
        return shown.filter((row) => !row.closed);
      },
      async showNotification(title, options) {
        await state.show?.(title, options);
        const item = {
          title,
          ...options,
          closed: false,
          close() {
            this.closed = true;
          },
        };
        shown.push(item);
      },
    },
    clients: {
      matchAll: async () => state.existing,
      openWindow: async (url) => {
        opened.push(url);
        return {};
      },
    },
  };
  const context = vm.createContext({
    self,
    indexedDB,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      requests.push({ url, options, body });
      return state.fetch ? state.fetch(body) : result(body);
    },
  });
  vm.runInContext(source, context, { filename: "servizato-push-sw.js" });
  async function dispatch(name, event) {
    const pending = [];
    handlers.get(name)({
      ...event,
      waitUntil: (promise) => pending.push(promise),
    });
    await Promise.all(pending);
  }
  async function message(
    data,
    sender = { type: "window", url: "https://servizato.example/customer" },
  ) {
    let response;
    await dispatch("message", {
      data,
      source: sender,
      ports: [
        {
          postMessage: (value) => {
            response = structuredClone(value);
          },
        },
      ],
    });
    return response;
  }
  const bind = (value = binding) =>
    message({ type: "SERVIZATO_PUSH_BIND", binding: value });
  const clear = () => message({ type: "SERVIZATO_PUSH_CLEAR" });
  const read = () => message({ type: "SERVIZATO_PUSH_STATE" });
  const push = (value) => {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return dispatch("push", {
      data: { text: () => text, json: () => JSON.parse(text) },
    });
  };
  const click = (notification) =>
    dispatch("notificationclick", { notification });
  function client(url, focused = false) {
    const row = {
      url,
      focused,
      async navigate(target) {
        navigation.push({ from: this.url, to: target });
        return this;
      },
      async focus() {
        this.focused = true;
        return this;
      },
    };
    state.existing.push(row);
    return row;
  }
  return {
    handlers,
    state,
    memory,
    shown,
    requests,
    opened,
    navigation,
    self,
    message,
    bind,
    clear,
    read,
    push,
    click,
    client,
  };
}

test("worker has only push/message/click handlers and performs no automatic subscription, fetch or display", () => {
  const f = fixture();
  assert.deepEqual([...f.handlers.keys()].sort(), [
    "message",
    "notificationclick",
    "push",
  ]);
  assert.equal(f.requests.length, 0);
  assert.equal(f.shown.length, 0);
  assert.doesNotMatch(
    source,
    /requestPermission\s*\(|pushManager\.subscribe|addEventListener\(["']fetch|caches\.|VAPID_PRIVATE_KEY/,
  );
});
test("binding channel validates the source window, exact fields and identifiers", async () => {
  const f = fixture();
  assert.deepEqual(await f.read(), { ok: true, binding: null });
  for (const sender of [
    { type: "window", url: "https://evil.example/customer" },
    { type: "window", url: "javascript:alert(1)" },
    { type: "worker", url: "https://servizato.example/sw.js" },
    null,
  ])
    assert.deepEqual(
      await f.message({ type: "SERVIZATO_PUSH_BIND", binding }, sender),
      { ok: false },
    );
  for (const value of [
    { ...binding, ownerId: "invalid" },
    { ...binding, bindingToken: "a" },
    { ...binding, endpoint: "https://private.example" },
  ])
    assert.deepEqual(await f.bind(value), { ok: false });
  assert.deepEqual(
    await f.message({ type: "SERVIZATO_PUSH_CLEAR", ownerId: id(2) }),
    { ok: false },
  );
  assert.deepEqual(await f.bind(), { ok: true });
  assert.deepEqual(await f.read(), { ok: true, binding });
});
test("authorized push uses only generic copy, own icon and the authoritative same-origin resolver", async () => {
  const f = fixture({
    fetch: async (body) =>
      result(body, {
        title: "Private OTP 123456",
        body: "Customer phone 9000000000 and bank details",
      }),
  });
  await f.bind();
  await f.push(payload());
  assert.equal(f.shown.length, 1);
  const shown = f.shown[0];
  assert.equal(shown.title, "Servizato");
  assert.equal(shown.body, "Open your account to review an update.");
  assert.equal(shown.icon, "/servizato-icon.png");
  assert.equal(shown.tag, `servizato-${id(3)}`);
  assert.equal(shown.renotify, false);
  assert.equal(JSON.stringify(shown).includes("123456"), false);
  assert.equal(JSON.stringify(shown).includes("9000000000"), false);
  assert.equal(f.requests[0].url, "/api/notifications/push/resolve");
  assert.equal(f.requests[0].options.credentials, "same-origin");
  assert.equal(f.requests[0].options.cache, "no-store");
  assert.equal(f.requests[0].options.redirect, "error");
  assert.deepEqual(f.requests[0].body, {
    notificationId: id(3),
    subscriptionId: binding.subscriptionId,
    bindingToken: binding.bindingToken,
  });
});
test("malformed, oversized and privacy-bearing payloads are rejected before resolution", async () => {
  const f = fixture();
  await f.bind();
  for (const value of [
    "not JSON",
    "x".repeat(513),
    null,
    [],
    {},
    { ...payload(), v: 2 },
    { ...payload(), title: "Sensitive title" },
    { ...payload(), url: "https://evil.example" },
    { ...payload(), notificationId: "invalid" },
    { ...payload(), subscriptionId: "x" },
    { ...payload(), bindingToken: "wrong" },
  ])
    await f.push(value);
  assert.equal(f.requests.length, 0);
  assert.equal(f.shown.length, 0);
});
test("missing storage or a failed binding write fails closed without display", async () => {
  const f = fixture({ failStorage: true });
  assert.deepEqual(await f.bind(), { ok: false });
  assert.deepEqual(await f.read(), { ok: false });
  await f.push(payload());
  assert.equal(f.requests.length, 0);
  const g = fixture();
  await g.bind();
  g.state.failWrite = true;
  assert.deepEqual(await g.clear(), { ok: false });
  await g.push(payload());
  assert.equal(g.requests.length, 0);
  assert.equal(g.shown.length, 0);
});
test("unauthorized, failed or mismatched resolver responses never display or navigate", async () => {
  for (const response of [
    async () => ({ ok: false, status: 401 }),
    async () => ({ ok: false, status: 403 }),
    async () => {
      throw new Error("Offline");
    },
    async (body) => result(body, { tag: "servizato-wrong" }),
    async (body) => result(body, { url: null }),
  ]) {
    const f = fixture({ fetch: response });
    await f.bind();
    await f.push(payload());
    assert.equal(f.shown.length, 0);
    assert.equal(f.opened.length, 0);
  }
});
test("replayed and concurrent duplicate push events display once; the replay list remains bounded", async () => {
  const f = fixture();
  await f.bind();
  await Promise.all([f.push(payload()), f.push(payload()), f.push(payload())]);
  await f.push(payload());
  assert.equal(f.shown.length, 1);
  for (let n = 4; n < 107; n++) await f.push(payload(n));
  assert.equal(f.memory.get("seen").length, 100);
  assert.equal(f.shown.length, 104);
  await f.bind();
  await f.push(payload(106));
  assert.equal(f.shown.length, 104);
});
test("clear drops queued pushes, closes only Servizato notifications and leaves no active binding", async () => {
  const f = fixture();
  await f.bind();
  await f.push(payload());
  f.shown.push({
    tag: "another-feature",
    closed: false,
    close() {
      this.closed = true;
    },
  });
  assert.deepEqual(await f.clear(), { ok: true });
  assert.equal(f.shown[0].closed, true);
  assert.equal(f.shown[1].closed, false);
  assert.deepEqual(await f.read(), { ok: true, binding: null });
  await f.push(payload(4));
  assert.equal(f.requests.length, 1);
});
test("account reassociation rotates the binding, closes old notifications and suppresses old account payloads", async () => {
  const f = fixture(),
    next = { ...binding, ownerId: id(20), bindingToken: "b".repeat(64) };
  await f.bind();
  await f.push(payload());
  await f.bind(next);
  assert.equal(f.shown[0].closed, true);
  await f.push(payload(4));
  assert.equal(f.requests.length, 1);
  await f.push(payload(5, next));
  assert.equal(f.shown.length, 2);
  assert.deepEqual((await f.read()).binding, next);
});
test("a clear while authorization is in flight wins before display", async () => {
  const started = deferred(),
    response = deferred(),
    f = fixture({
      fetch: async () => {
        started.resolve();
        return response.promise;
      },
    });
  await f.bind();
  const pending = f.push(payload());
  await started.promise;
  await f.clear();
  response.resolve(result(payload()));
  await pending;
  assert.equal(f.shown.length, 0);
});
test("a new account binding while old authorization is in flight prevents stale display", async () => {
  const started = deferred(),
    response = deferred(),
    f = fixture({
      fetch: async () => {
        started.resolve();
        return response.promise;
      },
    });
  await f.bind();
  const pending = f.push(payload());
  await started.promise;
  await f.bind({ ...binding, ownerId: id(20), bindingToken: "b".repeat(64) });
  response.resolve(result(payload()));
  await pending;
  assert.equal(f.shown.length, 0);
});
test("a clear during notification display closes it immediately after the browser operation completes", async () => {
  const started = deferred(),
    release = deferred(),
    f = fixture({
      show: async () => {
        started.resolve();
        await release.promise;
      },
    });
  await f.bind();
  const pending = f.push(payload());
  await started.promise;
  const clearing = f.clear();
  release.resolve();
  await Promise.all([pending, clearing]);
  assert.equal(f.shown.length, 1);
  assert.equal(f.shown[0].closed, true);
});
test("click re-authorizes and focuses/navigates an existing same-origin window", async () => {
  const f = fixture();
  await f.bind();
  f.client("https://evil.example/customer", true);
  f.client("https://servizato.example/customer", false);
  const focused = f.client("https://servizato.example/notifications", true);
  await f.push(payload());
  await f.click(f.shown[0]);
  assert.equal(f.shown[0].closed, true);
  assert.equal(f.requests.length, 2);
  assert.equal(f.opened.length, 0);
  assert.equal(f.navigation.length, 1);
  assert.equal(f.navigation[0].from, focused.url);
  assert.equal(
    f.navigation[0].to,
    `https://servizato.example/customer/bookings/${id(9)}`,
  );
});
test("click opens a validated window when there is no existing application window", async () => {
  const f = fixture();
  await f.bind();
  await f.push(payload());
  await f.click(f.shown[0]);
  assert.deepEqual(f.opened, [
    `https://servizato.example/customer/bookings/${id(9)}`,
  ]);
});
test("external, encoded, traversal and non-workspace click targets fall back to notifications", async () => {
  const attacks = [
    "https://evil.example",
    "//evil.example",
    "\\\\evil.example",
    "/customer/../admin",
    "/customer/%2e%2e/admin",
    "/customer/%252e%252e/admin",
    "/customer/x?next=https://evil.example",
    "/customer/x#fragment",
    "/customer/x\\y",
    "/customer/x\n",
    "/api/auth/signout",
    "/signin",
    "/notifications?next=x",
    "/customer//bookings/a",
    "javascript:alert(1)",
  ];
  for (const url of attacks) {
    const f = fixture({ fetch: async (body) => result(body, { url }) });
    await f.bind();
    await f.push(payload());
    await f.click(f.shown[0]);
    assert.deepEqual(
      f.opened,
      ["https://servizato.example/notifications"],
      url,
    );
  }
});
test("deleted/inaccessible destinations and stale account clicks close without navigation", async () => {
  const f = fixture();
  await f.bind();
  await f.push(payload());
  f.state.fetch = async () => ({ ok: false, status: 404 });
  await f.click(f.shown[0]);
  assert.equal(f.opened.length, 0);
  assert.equal(f.shown[0].closed, true);
  const g = fixture();
  await g.bind();
  await g.push(payload());
  await g.clear();
  await g.click(g.shown[0]);
  assert.equal(g.opened.length, 0);
  assert.equal(g.requests.length, 1);
});
test("logout during click authorization suppresses navigation", async () => {
  const f = fixture();
  await f.bind();
  await f.push(payload());
  const started = deferred(),
    response = deferred();
  f.state.fetch = async () => {
    started.resolve();
    return response.promise;
  };
  const pending = f.click(f.shown[0]);
  await started.promise;
  await f.clear();
  response.resolve(result(payload()));
  await pending;
  assert.equal(f.opened.length, 0);
  assert.equal(f.navigation.length, 0);
});

test("binding messages reject boxed strings instead of coercing operational identifiers", async () => {
  const f = fixture();
  for (const key of ["subscriptionId", "bindingToken", "ownerId"]) {
    const boxed = Object(binding[key]);
    assert.deepEqual(await f.bind({ ...binding, [key]: boxed }), { ok: false });
  }
  assert.deepEqual(await f.read(), { ok: true, binding: null });
});

test("conditional clear from a stale account leaves the new binding and its notifications intact", async () => {
  const f = fixture(),
    next = { ...binding, ownerId: id(20), bindingToken: "b".repeat(64) };
  await f.bind();
  await f.bind(next);
  await f.push(payload(4, next));
  assert.deepEqual(await f.message({ type: "SERVIZATO_PUSH_CLEAR", binding }), {
    ok: true,
  });
  assert.deepEqual((await f.read()).binding, next);
  assert.equal(f.shown[0].closed, false);
  await f.push(payload(5, next));
  assert.equal(f.shown.length, 2);
  assert.deepEqual(
    await f.message({ type: "SERVIZATO_PUSH_CLEAR", binding: next }),
    { ok: true },
  );
  assert.deepEqual((await f.read()).binding, null);
  assert.ok(f.shown.every((row) => row.closed));
});

test("an older conditional clear does not leave a newer queued BIND suspended", async () => {
  const f = fixture(),
    next = { ...binding, ownerId: id(20), bindingToken: "b".repeat(64) };
  await f.bind();
  const clearing = f.message({ type: "SERVIZATO_PUSH_CLEAR", binding });
  const switching = f.bind(next);
  await Promise.all([clearing, switching]);
  assert.deepEqual((await f.read()).binding, next);
  await f.push(payload(5, next));
  assert.equal(f.shown.length, 1);
});

test("matching conditional clear suppresses an in-flight push authorization", async () => {
  const started = deferred(),
    response = deferred(),
    f = fixture({
      fetch: async () => {
        started.resolve();
        return response.promise;
      },
    });
  await f.bind();
  const pending = f.push(payload());
  await started.promise;
  await f.message({ type: "SERVIZATO_PUSH_CLEAR", binding });
  response.resolve(result(payload()));
  await pending;
  assert.equal(f.shown.length, 0);
  assert.deepEqual((await f.read()).binding, null);
});

test("stale conditional cleanup does not cancel the new account's in-flight push", async () => {
  const next = { ...binding, ownerId: id(20), bindingToken: "b".repeat(64) },
    started = deferred(),
    response = deferred();
  const f = fixture({
    fetch: async () => {
      started.resolve();
      return response.promise;
    },
  });
  await f.bind(next);
  const pending = f.push(payload(5, next));
  await started.promise;
  await f.message({ type: "SERVIZATO_PUSH_CLEAR", binding });
  response.resolve(result(payload(5, next)));
  await pending;
  assert.equal(f.shown.length, 1);
  assert.equal(f.shown[0].closed, false);
});
