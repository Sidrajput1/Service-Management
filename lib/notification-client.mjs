/** Notification counts always come from the authenticated API, never event arithmetic. */
export const notificationSignalKey = "servizato.notifications.changed.v1";
export function notificationBadge(count) {
  if (!Number.isSafeInteger(count) || count < 0)
    return { text: null, label: "Notifications, unread count unavailable" };
  return {
    text: count > 0 ? (count > 99 ? "99+" : String(count)) : null,
    label: `Notifications, ${count} unread`,
  };
}
export function notificationFeed(value) {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray(value.notifications) ||
    !Number.isSafeInteger(value.unreadCount) ||
    value.unreadCount < 0
  )
    throw new Error("Invalid notification response");
  return value;
}
export function safeNotificationLink(value, role) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\s\u0000-\u001f\u007f]/u.test(value)
  )
    return "/notifications";
  const path = value.split(/[?#]/u)[0];
  if (path === "/notifications") return path;
  const prefix = {
    technician: "/technician/",
    customer: "/customer/",
    service_provider: "/service-provider/",
    admin: "/admin/",
    dispatcher: "/dispatcher/",
  }[role];
  // Keep links inside the recipient's normal workspace; never trust an arbitrary URL in a notification.
  return prefix &&
    path.startsWith(prefix) &&
    !/%(?:2f|5c|2e)/iu.test(path) &&
    !path.includes("..")
    ? path
    : "/notifications";
}
/** @param {string} userId @param {(path:string, options:{signal:AbortSignal})=>Promise<unknown>} fetcher */
export function notificationQueryOptions(
  userId,
  fetcher,
  { limit = 20, cursor, unreadOnly = false } = {},
) {
  const size = Math.min(50, Math.max(1, Math.floor(limit) || 20));
  const params = new URLSearchParams({
    limit: String(size),
    ...(cursor ? { cursor } : {}),
    ...(unreadOnly ? { unreadOnly: "true" } : {}),
  });
  return {
    queryKey: unreadOnly
      ? ["notifications-unread", userId]
      : ["notifications", size, cursor, userId],
    queryFn: async ({ signal }) =>
      notificationFeed(await fetcher(`/notifications?${params}`, { signal })),
    staleTime: 5000,
    gcTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: "always",
  };
}
const registrations = new WeakMap();
const matchesUser = (query, userId) =>
  ["notifications", "notifications-unread"].includes(query.queryKey[0]) &&
  query.queryKey.at(-1) === userId;
export function refreshNotifications(client, userId) {
  if (!userId) return Promise.resolve();
  return client.invalidateQueries(
    { predicate: (query) => matchesUser(query, userId) },
    { cancelRefetch: false },
  );
}
export function cancelNotificationReads(client, userId) {
  if (!userId) return Promise.resolve();
  return client.cancelQueries({
    predicate: (query) => matchesUser(query, userId),
  });
}
/** A poll/focus read can start during the write, so fence reads again after the write commits. */
export async function notificationWriteConfirmed(client, userId) {
  await cancelNotificationReads(client, userId);
  publishNotificationChange(userId);
  await refreshNotifications(client, userId);
}
/** One listener per query client/account, even when several bells or lists mount. */
export function subscribeNotificationUpdates(
  client,
  userId,
  events = globalThis.window,
) {
  if (!events || !userId) return () => {};
  let owners = registrations.get(client);
  if (!owners) {
    owners = new Map();
    registrations.set(client, owners);
  }
  let entry = owners.get(userId);
  if (!entry) {
    entry = { refs: 0, queued: false, active: true };
    const current = entry;
    current.listener = (event) => {
      if (
        event.key !== notificationSignalKey ||
        typeof event.newValue !== "string" ||
        event.newValue.length > 256
      )
        return;
      try {
        if (
          JSON.parse(event.newValue)?.userId !== userId ||
          current.lastSignal === event.newValue
        )
          return;
      } catch {
        return;
      }
      current.lastSignal = event.newValue;
      if (current.queued) return;
      current.queued = true;
      queueMicrotask(async () => {
        current.queued = false;
        if (!current.active) return;
        await cancelNotificationReads(client, userId);
        if (current.active) void refreshNotifications(client, userId);
      });
    };
    events.addEventListener("storage", current.listener);
    current.events = events;
    owners.set(userId, current);
  }
  entry.refs++;
  return () => {
    if (--entry.refs > 0) return;
    entry.active = false;
    entry.events.removeEventListener("storage", entry.listener);
    owners.delete(userId);
  };
}
export function publishNotificationChange(userId, storage) {
  if (!userId) return;
  try {
    (storage || globalThis.window?.localStorage)?.setItem(
      notificationSignalKey,
      JSON.stringify({
        userId,
        nonce:
          globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      }),
    );
  } catch {
    /* Polling and focus/reconnect refresh remain available if browser storage is blocked. */
  }
}
