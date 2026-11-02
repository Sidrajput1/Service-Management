/* Servizato Web Push only: no fetch interception, offline cache or automatic subscription. */
"use strict";

const PUSH_DATABASE = "servizato-web-push-v1";
const PUSH_STORE = "state";
const HEX_ID = /^[a-f\d]{24}$/;
const BINDING_TOKEN = /^[a-f\d]{64}$/;
const GENERIC_BODY = "Open your account to review an update.";
const MAX_SEEN = 100;
let database;
let serial = Promise.resolve();
let generation = 0;
let blocked = false;

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value, keys) {
  return (
    record(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(",")
  );
}
function validBinding(value) {
  return (
    exactKeys(value, ["subscriptionId", "bindingToken", "ownerId"]) &&
    typeof value.subscriptionId === "string" &&
    HEX_ID.test(value.subscriptionId) &&
    typeof value.bindingToken === "string" &&
    BINDING_TOKEN.test(value.bindingToken) &&
    typeof value.ownerId === "string" &&
    HEX_ID.test(value.ownerId)
  );
}
function validPayload(value) {
  return (
    exactKeys(value, [
      "v",
      "notificationId",
      "subscriptionId",
      "bindingToken",
    ]) &&
    value.v === 1 &&
    typeof value.notificationId === "string" &&
    HEX_ID.test(value.notificationId) &&
    typeof value.subscriptionId === "string" &&
    HEX_ID.test(value.subscriptionId) &&
    typeof value.bindingToken === "string" &&
    BINDING_TOKEN.test(value.bindingToken)
  );
}
function sameBinding(binding, value) {
  return (
    validBinding(binding) &&
    binding.subscriptionId === value.subscriptionId &&
    binding.bindingToken === value.bindingToken
  );
}
function exclusive(operation) {
  const result = serial.then(operation, operation);
  serial = result.catch(() => {});
  return result;
}
function openDatabase() {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(PUSH_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PUSH_STORE))
        request.result.createObjectStore(PUSH_STORE);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      database = undefined;
      reject(new Error("Push storage is unavailable"));
    };
    request.onblocked = () => {
      database = undefined;
      reject(new Error("Push storage is unavailable"));
    };
  });
  return database;
}
async function readState() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PUSH_STORE, "readonly");
    const store = transaction.objectStore(PUSH_STORE);
    const binding = store.get("binding"),
      seen = store.get("seen");
    transaction.oncomplete = () => {
      const saved = binding.result ?? null;
      if (saved !== null && !validBinding(saved)) {
        reject(new Error("Invalid push storage"));
        return;
      }
      resolve({
        binding: saved,
        seen: Array.isArray(seen.result)
          ? seen.result
              .filter((id) => typeof id === "string" && HEX_ID.test(id))
              .slice(-MAX_SEEN)
          : [],
      });
    };
    transaction.onerror = transaction.onabort = () =>
      reject(new Error("Push storage is unavailable"));
  });
}
async function writeState(state) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PUSH_STORE, "readwrite");
    const store = transaction.objectStore(PUSH_STORE);
    store.put(state.binding, "binding");
    store.put(state.seen.slice(-MAX_SEEN), "seen");
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () =>
      reject(new Error("Push storage is unavailable"));
  });
}
function trustedClient(source) {
  try {
    return (
      source?.type === "window" &&
      new URL(source.url).origin === self.location.origin
    );
  } catch {
    return false;
  }
}
async function closeServizatoNotifications() {
  const notifications = await self.registration.getNotifications();
  for (const notification of notifications) {
    if (
      typeof notification.tag === "string" &&
      notification.tag.startsWith("servizato-")
    )
      notification.close();
  }
}
function reply(event, value) {
  try {
    event.ports?.[0]?.postMessage(value);
  } catch {
    /* A closed settings tab needs no reply. */
  }
}
self.addEventListener("message", (event) => {
  const message = event.data;
  if (!trustedClient(event.source) || !record(message)) {
    reply(event, { ok: false });
    return;
  }
  if (exactKeys(message, ["type"]) && message.type === "SERVIZATO_PUSH_STATE") {
    event.waitUntil(
      exclusive(async () => {
        const state = await readState();
        reply(event, { ok: true, binding: blocked ? null : state.binding });
      }).catch(() => reply(event, { ok: false })),
    );
    return;
  }
  const clear =
    message.type === "SERVIZATO_PUSH_CLEAR" &&
    (exactKeys(message, ["type"]) ||
      (exactKeys(message, ["type", "binding"]) &&
        validBinding(message.binding)));
  const bind =
    exactKeys(message, ["type", "binding"]) &&
    message.type === "SERVIZATO_PUSH_BIND" &&
    validBinding(message.binding);
  if (!clear && !bind) {
    reply(event, { ok: false });
    return;
  }
  if (clear && message.binding) {
    // A stale tab may finish cleanup after another account has already bound this browser.
    // Its conditional clear must neither erase nor suspend the new association.
    const observedGeneration = generation;
    event.waitUntil(
      exclusive(async () => {
        if (observedGeneration !== generation) {
          reply(event, { ok: true });
          return;
        }
        const state = await readState();
        if (
          observedGeneration !== generation ||
          !sameBinding(state.binding, message.binding) ||
          state.binding.ownerId !== message.binding.ownerId
        ) {
          reply(event, { ok: true });
          return;
        }
        ++generation;
        blocked = true;
        await writeState({ binding: null, seen: [] });
        await closeServizatoNotifications();
        reply(event, { ok: true });
      }).catch(() => reply(event, { ok: false })),
    );
    return;
  }
  // Invalidate a fetch already in flight before waiting for any IndexedDB operation.
  const operationGeneration = ++generation;
  blocked = true;
  event.waitUntil(
    exclusive(async () => {
      if (clear) {
        await writeState({ binding: null, seen: [] });
        await closeServizatoNotifications();
      } else {
        const old = await readState();
        const unchanged =
          sameBinding(old.binding, message.binding) &&
          old.binding.ownerId === message.binding.ownerId;
        await writeState({
          binding: { ...message.binding },
          seen: unchanged ? old.seen : [],
        });
        if (!unchanged) await closeServizatoNotifications();
        if (operationGeneration === generation) blocked = false;
      }
      reply(event, { ok: true });
    }).catch(() => reply(event, { ok: false })),
  );
});

function safeDestination(value) {
  if (
    typeof value !== "string" ||
    value.length > 300 ||
    !value.startsWith("/") ||
    value.includes("//") ||
    /[\\%?#\s\u0000-\u001f\u007f.]/u.test(value)
  )
    return "/notifications";
  if (
    value !== "/notifications" &&
    !/^\/(customer|technician|service-provider|admin|dispatcher)(\/[A-Za-z0-9_-]+)+\/?$/.test(
      value,
    )
  )
    return "/notifications";
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin &&
      !url.search &&
      !url.hash &&
      url.pathname === value
      ? value
      : "/notifications";
  } catch {
    return "/notifications";
  }
}
async function resolveNotification(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api/notifications/push/resolve", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        notificationId: payload.notificationId,
        subscriptionId: payload.subscriptionId,
        bindingToken: payload.bindingToken,
      }),
    });
    if (!response.ok) return null;
    const value = await response.json();
    if (
      !record(value) ||
      value.tag !== `servizato-${payload.notificationId}` ||
      typeof value.url !== "string"
    )
      return null;
    return safeDestination(value.url);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function authorizedBinding(payload, expectedGeneration) {
  if (blocked || generation !== expectedGeneration) return false;
  const state = await readState();
  return (
    !blocked &&
    generation === expectedGeneration &&
    sameBinding(state.binding, payload)
  );
}
self.addEventListener("push", (event) => {
  const expectedGeneration = generation;
  event.waitUntil(
    (async () => {
      let payload;
      try {
        if (!event.data || event.data.text().length > 512) return;
        payload = event.data.json();
      } catch {
        return;
      }
      if (!validPayload(payload)) return;
      const eligible = await exclusive(async () => {
        if (!(await authorizedBinding(payload, expectedGeneration)))
          return false;
        return !(await readState()).seen.includes(payload.notificationId);
      });
      if (!eligible) return;
      const destination = await resolveNotification(payload);
      if (!destination) return;
      await exclusive(async () => {
        if (!(await authorizedBinding(payload, expectedGeneration))) return;
        const state = await readState();
        if (state.seen.includes(payload.notificationId)) return;
        // Persist the bounded replay guard before showing: delivery remains best effort.
        await writeState({
          binding: state.binding,
          seen: [...state.seen, payload.notificationId],
        });
        if (blocked || generation !== expectedGeneration) return;
        await self.registration.showNotification("Servizato", {
          body: GENERIC_BODY,
          icon: "/servizato-icon.png",
          tag: `servizato-${payload.notificationId}`,
          renotify: false,
          data: { ...payload },
        });
        if (blocked || generation !== expectedGeneration)
          await closeServizatoNotifications();
      });
    })().catch(() => {
      /* Fail closed; in-app notifications remain the source of truth. */
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const payload = event.notification.data,
    expectedGeneration = generation;
  event.waitUntil(
    (async () => {
      if (
        !validPayload(payload) ||
        !(await exclusive(() => authorizedBinding(payload, expectedGeneration)))
      )
        return;
      const destination = await resolveNotification(payload);
      if (
        !destination ||
        !(await exclusive(() => authorizedBinding(payload, expectedGeneration)))
      )
        return;
      const target = new URL(destination, self.location.origin).href;
      const windows = (
        await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        })
      ).filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });
      if (
        !(await exclusive(() => authorizedBinding(payload, expectedGeneration)))
      )
        return;
      const client = windows.find((window) => window.focused) || windows[0];
      if (client) {
        try {
          const navigated = await client.navigate(target);
          await (navigated || client).focus();
          return;
        } catch {
          /* Open the same validated internal destination if navigation failed. */
        }
      }
      if (await exclusive(() => authorizedBinding(payload, expectedGeneration)))
        await self.clients.openWindow(target);
    })().catch(() => {
      /* A stale or unavailable account never navigates from a push. */
    }),
  );
});
