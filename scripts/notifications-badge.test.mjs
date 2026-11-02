import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as notifications from "../lib/notification-client.mjs";
import { arrivalMessage } from "../lib/arrival-message.mjs";
const require = createRequire(import.meta.url);
const id = (value) => value.repeat(24);
function load(file, modules = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name in modules) return modules[name];
      if (name.startsWith("@/"))
        throw new Error(`Missing notification test import ${name}`);
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
test("badge hides zero, displays one/two and caps large visible counts while retaining an exact accessible label", () => {
  for (const [count, text] of [
    [0, null],
    [1, "1"],
    [2, "2"],
    [99, "99"],
    [100, "99+"],
    [1540, "99+"],
  ]) {
    assert.equal(notifications.notificationBadge(count).text, text);
    assert.equal(
      notifications.notificationBadge(count).label,
      `Notifications, ${count} unread`,
    );
  }
  for (const value of [undefined, null, NaN, -1, "2", 1.2]) {
    assert.equal(notifications.notificationBadge(value).text, null);
    assert.match(notifications.notificationBadge(value).label, /unavailable/);
  }
});
test("invalid feed data is a failure rather than a fabricated zero and links stay inside the recipient workspace", () => {
  for (const value of [
    {},
    { notifications: [], unreadCount: "2" },
    { notifications: [], unreadCount: -1 },
  ])
    assert.throws(() => notifications.notificationFeed(value));
  assert.equal(
    notifications.safeNotificationLink(
      `/technician/all-jobs/${id("a")}`,
      "technician",
    ),
    `/technician/all-jobs/${id("a")}`,
  );
  for (const value of [
    "https://external.test",
    "//external.test",
    "/\\external",
    "/technician/../admin",
    "/technician/%2e%2e/admin",
    "/admin/jobs",
  ])
    assert.equal(
      notifications.safeNotificationLink(value, "technician"),
      "/notifications",
    );
});
function fixture() {
  let actor = { _id: id("a"), role: "technician" },
    fail = false;
  const rows = [
    {
      _id: id("c"),
      recipientUserId: id("a"),
      status: "unread",
      title: "First",
      message: "Job assigned",
      createdAt: new Date().toISOString(),
    },
    {
      _id: id("d"),
      recipientUserId: id("a"),
      status: "unread",
      title: "Second",
      message: "Job updated",
      createdAt: new Date().toISOString(),
    },
    {
      _id: id("e"),
      recipientUserId: id("b"),
      status: "unread",
      title: "Other user",
      message: "Private",
      createdAt: new Date().toISOString(),
    },
  ];
  class ApiAuthError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  const auth = {
    ApiAuthError,
    requireCurrentUser: async () => {
      if (!actor) throw new ApiAuthError("Unauthorized", 401);
      return actor;
    },
  };
  const response = load("lib/api-response.ts", { "@/lib/auth": auth });
  const pagination = load("lib/pagination.ts");
  const matches = (row, filter) =>
    Object.entries(filter).every(([key, value]) =>
      key === "_id" && typeof value === "object"
        ? row._id < value.$lt
        : row[key] === value,
    );
  const model = {
    find(filter) {
      if (fail) throw new Error("Controlled outage");
      let limit = 50;
      return {
        sort() {
          return this;
        },
        limit(value) {
          limit = value;
          return this;
        },
        select() {
          return this;
        },
        lean: async () =>
          rows
            .filter((row) => matches(row, filter))
            .slice(0, limit)
            .map((row) => ({ ...row })),
      };
    },
    countDocuments: async (filter) =>
      rows.filter((row) => matches(row, filter)).length,
    findOneAndUpdate(filter, update) {
      const row = rows.find((value) => matches(value, filter));
      if (row) Object.assign(row, update.$set);
      return {
        select() {
          return this;
        },
        lean: async () =>
          row ? { _id: row._id, status: row.status, readAt: row.readAt } : null,
      };
    },
    updateMany: async (filter, update) => {
      for (const row of rows.filter((value) => matches(value, filter)))
        Object.assign(row, update.$set);
    },
  };
  const audience = {
    notificationAudience: (user) => ({ recipientUserId: user._id }),
  };
  const deps = {
    "@/lib/auth": auth,
    "@/lib/access-policy.mjs": audience,
    "@/lib/api-response": response,
    "@/lib/pagination": pagination,
    "@/models/notification": model,
  };
  const get = load("app/api/notifications/route.ts", deps).GET;
  const read = load("app/api/notifications/[id]/route.ts", deps).PUT;
  const all = load("app/api/notifications/mark-all-read/route.ts", deps).POST;
  return {
    get,
    read,
    all,
    rows,
    setActor(value) {
      actor = value;
    },
    outage(value) {
      fail = value;
    },
    fetch: async (path) => {
      const result = await get(new Request(`http://test/api${path}`));
      const body = await result.json();
      if (!result.ok) throw new Error(body.error);
      return body;
    },
  };
}
test("actual notification handlers count only this user's unread rows and deny cross-user read/anonymous requests", async () => {
  const f = fixture();
  const response = await f.get(
    new Request("http://test/api/notifications?limit=1&unreadOnly=true"),
  );
  const body = await response.json();
  assert.equal(body.notifications.length, 1);
  assert.equal(body.unreadCount, 2);
  const foreign = await f.read(
    new Request("http://test", {
      method: "PUT",
      body: JSON.stringify({ status: "read" }),
    }),
    { params: Promise.resolve({ id: id("e") }) },
  );
  assert.equal(foreign.status, 404);
  assert.equal(f.rows[2].status, "unread");
  f.setActor(null);
  assert.equal((await f.get(new Request("http://test"))).status, 401);
});
test("real QueryClient reconciles new/read/read-all states with the server; duplicate refreshes never increment counts", async (t) => {
  const f = fixture(),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  t.after(() => client.clear());
  const options = notifications.notificationQueryOptions(
    id("a"),
    (path) => f.fetch(path),
    { limit: 1, unreadOnly: true },
  );
  const observer = new QueryObserver(client, options),
    stop = observer.subscribe(() => {});
  t.after(stop);
  await client.fetchQuery(options);
  assert.equal(client.getQueryData(options.queryKey).unreadCount, 2);
  f.rows.push({
    _id: id("f"),
    recipientUserId: id("a"),
    status: "unread",
    title: "New",
    message: "Update",
  });
  await Promise.all([
    notifications.refreshNotifications(client, id("a")),
    notifications.refreshNotifications(client, id("a")),
  ]);
  assert.equal(client.getQueryData(options.queryKey).unreadCount, 3);
  await notifications.cancelNotificationReads(client, id("a"));
  assert.equal(
    (
      await f.read(
        new Request("http://test", {
          method: "PUT",
          body: '{"status":"read"}',
        }),
        { params: Promise.resolve({ id: id("c") }) },
      )
    ).status,
    200,
  );
  await notifications.refreshNotifications(client, id("a"));
  assert.equal(client.getQueryData(options.queryKey).unreadCount, 2);
  await f.all();
  await notifications.refreshNotifications(client, id("a"));
  assert.equal(
    notifications.notificationBadge(
      client.getQueryData(options.queryKey).unreadCount,
    ).text,
    null,
  );
  assert.equal(f.rows[2].status, "unread");
});
test("read request failures retain the last authoritative cached count rather than showing zero", async (t) => {
  const f = fixture(),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  t.after(() => client.clear());
  const options = notifications.notificationQueryOptions(
    id("a"),
    (path) => f.fetch(path),
    { unreadOnly: true },
  );
  const observer = new QueryObserver(client, options),
    stop = observer.subscribe(() => {});
  t.after(stop);
  await client.fetchQuery(options);
  f.outage(true);
  await assert.rejects(
    client.fetchQuery({ ...options, staleTime: 0, retry: false }),
  );
  assert.equal(client.getQueryData(options.queryKey).unreadCount, 2);
});
test("cross-tab signals share one listener, coalesce duplicates and ignore other owners without trusting a count", async () => {
  const handlers = new Set();
  let refreshes = 0;
  const events = {
    addEventListener: (_, fn) => handlers.add(fn),
    removeEventListener: (_, fn) => handlers.delete(fn),
  };
  const client = {
    cancelQueries() {
      return Promise.resolve();
    },
    invalidateQueries({ predicate }) {
      assert.equal(
        predicate({ queryKey: ["notifications-unread", id("a")] }),
        true,
      );
      assert.equal(
        predicate({ queryKey: ["notifications-unread", id("b")] }),
        false,
      );
      refreshes++;
      return Promise.resolve();
    },
  };
  const first = notifications.subscribeNotificationUpdates(
      client,
      id("a"),
      events,
    ),
    second = notifications.subscribeNotificationUpdates(
      client,
      id("a"),
      events,
    );
  assert.equal(handlers.size, 1);
  const send = (value) => {
    for (const fn of handlers)
      fn({
        key: notifications.notificationSignalKey,
        newValue: JSON.stringify(value),
      });
  };
  send({ userId: id("b"), unreadCount: 500 });
  await Promise.resolve();
  assert.equal(refreshes, 0);
  send({ userId: id("a"), unreadCount: 500 });
  send({ userId: id("a"), unreadCount: 500 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshes, 1);
  send({ userId: id("a"), unreadCount: 500 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshes, 1);
  first();
  assert.equal(handlers.size, 1);
  second();
  assert.equal(handlers.size, 0);
  assert.doesNotThrow(() =>
    notifications.publishNotificationChange(id("a"), {
      setItem() {
        throw new Error("blocked");
      },
    }),
  );
});
test("a poll started during a read action cannot overwrite the post-commit authoritative count", async (t) => {
  const f = fixture(),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  t.after(() => client.clear());
  let delay = false,
    finish,
    capturedSignal;
  const options = notifications.notificationQueryOptions(
    id("a"),
    async (path, { signal }) => {
      if (!delay) return f.fetch(path);
      capturedSignal = signal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    { unreadOnly: true },
  );
  const observer = new QueryObserver(client, options),
    stop = observer.subscribe(() => {});
  t.after(stop);
  await client.fetchQuery(options);
  await notifications.cancelNotificationReads(client, id("a"));
  delay = true;
  const old = client
    .fetchQuery({ ...options, staleTime: 0 })
    .catch((error) => error);
  await f.read(
    new Request("http://test", { method: "PUT", body: '{"status":"read"}' }),
    { params: Promise.resolve({ id: id("c") }) },
  );
  delay = false;
  await notifications.notificationWriteConfirmed(client, id("a"));
  assert.equal(capturedSignal.aborted, true);
  assert.equal(client.getQueryData(options.queryKey).unreadCount, 1);
  finish({ notifications: [], unreadCount: 2 });
  await old;
  assert.equal(client.getQueryData(options.queryKey).unreadCount, 1);
});
test("bell SSR renders accessible exact counts, a 99+ badge, and last-known failure feedback", () => {
  const passthrough = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  let query;
  const loaded = load("components/notifications/NotifyBell.tsx", {
    "next/link": ({ children, ...props }) =>
      React.createElement("a", props, children),
    "next-auth/react": {
      useSession: () => ({ data: { user: { role: "technician" } } }),
    },
    "lucide-react": {
      Bell: () => null,
      CheckCheck: () => null,
      RefreshCw: () => null,
    },
    sonner: { toast: { error() {} } },
    "@/hooks/useNotifications": {
      useUnreadNotifications: () => query,
      useMarkNotificationRead: () => ({ mutate() {} }),
      useMarkAllNotificationsRead: () => ({ mutate() {} }),
    },
    "@/lib/notification-client.mjs": notifications,
    "@/components/ui/button": {
      Button: ({ children, ...props }) =>
        React.createElement("button", props, children),
    },
    "@/components/ui/dropdown-menu": {
      DropdownMenu: passthrough,
      DropdownMenuTrigger: ({ render, children }) =>
        React.cloneElement(render, {}, children),
      DropdownMenuContent: passthrough,
      DropdownMenuGroup: passthrough,
      DropdownMenuLabel: passthrough,
      DropdownMenuSeparator: () => null,
      DropdownMenuItem: ({ children }) =>
        React.createElement("div", null, children),
    },
  });
  for (const count of [0, 1, 2, 100]) {
    query = {
      data: { unreadCount: count, notifications: [] },
      isError: false,
      isLoading: false,
    };
    const html = renderToStaticMarkup(React.createElement(loaded.default));
    assert.match(
      html,
      new RegExp(`aria-label="Notifications, ${count} unread"`),
    );
    if (count === 100) assert.match(html, /99\+/);
  }
  query = {
    data: { unreadCount: 2, notifications: [] },
    isError: true,
    isLoading: false,
  };
  assert.match(
    renderToStaticMarkup(React.createElement(loaded.default)),
    /last known count/,
  );
  query = { isError: true, isLoading: false };
  const unknown = renderToStaticMarkup(React.createElement(loaded.default));
  assert.match(unknown, /unread count unavailable/);
  assert.equal(unknown.includes("0 unread"), false);
});
test("invoice and partial completion-notice retries reuse recipient records without resetting read state", async () => {
  const stored = new Map();
  let failProvider = false;
  const model = {
    findOneAndUpdate: async (filter, update) => {
      if (
        failProvider &&
        filter.dedupeKey === `job-completed:${id("f")}:${id("b")}`
      ) {
        failProvider = false;
        throw new Error("Controlled partial notification outage");
      }
      if (!stored.has(filter.dedupeKey))
        stored.set(filter.dedupeKey, { ...update.$setOnInsert });
      return stored.get(filter.dedupeKey);
    },
  };
  const creator = load("lib/notification.ts", {
    "@/models/notification": model,
    "./push-delivery": { scheduleNotificationPush() {} },
    "./db": { connectToDb: async () => {} },
    "@/models/user": {},
  });
  const events = load("lib/notify-events.ts", {
    "./notification": creator,
    "./arrival-message.mjs": { arrivalMessage },
  });
  const input = {
    customerUserId: id("a"),
    providerUserId: id("b"),
    invoiceId: id("c"),
    bookingId: id("d"),
    invoiceNumber: "CONTROLLED-1",
    amount: 100,
  };
  await events.notifyInvoiceIssued(input);
  assert.equal(stored.size, 2);
  const customerKey = `invoice-issued:${id("c")}:${id("a")}`;
  stored.get(customerKey).status = "read";
  await events.notifyInvoiceIssued(input);
  assert.equal(stored.size, 2);
  assert.equal(stored.get(customerKey).status, "read");
  assert.equal(
    stored.get(`invoice-issued:${id("c")}:${id("b")}`).status,
    "unread",
  );
  const completion = {
    ...input,
    jobId: id("f"),
    technicianUserId: id("e"),
    serviceName: "Controlled service",
  };
  failProvider = true;
  await assert.rejects(events.notifyServiceCompleted(completion));
  assert.equal(stored.size, 3);
  const completedCustomer = `job-completed:${id("f")}:${id("a")}`;
  stored.get(completedCustomer).status = "read";
  await events.notifyServiceCompleted(completion);
  await events.notifyServiceCompleted(completion);
  assert.equal(stored.size, 5);
  assert.equal(stored.get(completedCustomer).status, "read");
  assert.equal(
    stored.get(`job-completed:${id("f")}:${id("e")}`).actionUrl,
    `/technician/all-jobs/${id("f")}`,
  );
});
