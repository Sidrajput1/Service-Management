"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import type { SignOutParams } from "next-auth/react";

export const PUSH_STATE_EVENT = "servizato:push-state-changed";
const workerPath = "/servizato-push-sw.js";
const ownerKey = "servizato.push.owner.v1";
const dismissed = new Set<string>();
let currentOwner: string | null = null;
let generation = 0;
let cleanupPending: Promise<unknown> = Promise.resolve();

export interface PushDevice {
  id: string;
  deviceLabel: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastSeenAt?: string;
}
export interface PushConfig {
  configured: boolean;
  storageReady: boolean;
  publicKey: string | null;
  serviceWorkerPath: string;
}
interface Binding {
  subscriptionId: string;
  bindingToken: string;
  ownerId: string;
}
export interface PushDeviceState {
  supported: boolean;
  secureContext: boolean;
  permission: NotificationPermission | "unsupported";
  hasSubscription: boolean;
  serverDevice: PushDevice | null;
  workerBound: boolean;
  keyMatches: boolean | null;
  config: PushConfig | null;
  devices: PushDevice[];
}
export class PushClientError extends Error {}
function failure(message: string) {
  return new PushClientError(message);
}
function bounded<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(failure(message)), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
function changed() {
  globalThis.window?.dispatchEvent(new Event(PUSH_STATE_EVENT));
}
function saveOwner(owner: string | null) {
  try {
    if (owner) localStorage.setItem(ownerKey, owner);
    else localStorage.removeItem(ownerKey);
  } catch {
    /* Storage is optional. */
  }
}
function savedOwner() {
  try {
    return localStorage.getItem(ownerKey);
  } catch {
    return null;
  }
}
export function pushPromptDismissed(owner: string) {
  if (dismissed.has(owner)) return true;
  try {
    return localStorage.getItem(`servizato.push.dismissed.v1:${owner}`) === "1";
  } catch {
    return false;
  }
}
export function dismissPushPrompt(owner: string) {
  dismissed.add(owner);
  try {
    localStorage.setItem(`servizato.push.dismissed.v1:${owner}`, "1");
  } catch {
    /* Keep the in-memory preference. */
  }
  changed();
}
function clearDismissal(owner: string) {
  dismissed.delete(owner);
  try {
    localStorage.removeItem(`servizato.push.dismissed.v1:${owner}`);
  } catch {
    /* Optional preference. */
  }
}
export function browserPushFacts() {
  const secureContext =
    typeof window !== "undefined" && window.isSecureContext === true;
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator;
  return {
    supported,
    secureContext,
    permission: supported ? Notification.permission : ("unsupported" as const),
  };
}
function assertOwner(owner: string, version = generation) {
  if (!owner || owner !== currentOwner || version !== generation)
    throw failure(
      "Your account changed. Refresh notification settings before continuing.",
    );
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    response = await fetch(`/api/notifications/push${path}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: options.signal || controller.signal,
    });
  } catch {
    throw failure(
      "Notification settings could not reach the server. Please try again.",
    );
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw failure(
        "Sign in with your current account before changing notification settings.",
      );
    if (response.status === 429)
      throw failure(
        "Too many notification requests. Wait a moment and try again.",
      );
    if (response.status === 503)
      throw failure(
        "Browser notifications need server setup. In-app notifications still work.",
      );
    throw failure(
      "Notification settings could not be saved. Please try again.",
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw failure(
      "The notification settings response was incomplete. Please refresh.",
    );
  }
}
function ownWorker(registration: ServiceWorkerRegistration) {
  if (registration.scope !== new URL("/", location.origin).href) return false;
  const workers = [
    registration.active,
    registration.waiting,
    registration.installing,
  ].filter(Boolean) as ServiceWorker[];
  return (
    workers.length > 0 &&
    workers.every(
      (worker) =>
        worker.scriptURL === new URL(workerPath, location.origin).href,
    )
  );
}
async function existingRegistration() {
  if (!browserPushFacts().supported) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration && !ownWorker(registration))
    throw failure(
      "Another website worker is active. Ask support to review this device before enabling push.",
    );
  return registration || null;
}
function workerMessage(
  registration: ServiceWorkerRegistration,
  type: string,
  binding?: Binding,
) {
  return new Promise<{ ok: boolean; binding?: Binding | null }>(
    (resolve, reject) => {
      const worker = registration.active;
      if (!worker) {
        reject(
          failure("The notification worker is not ready. Try enabling again."),
        );
        return;
      }
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(
          failure(
            "The notification worker did not respond. Refresh and try again.",
          ),
        );
      }, 3000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        if (event.data?.ok !== true)
          reject(
            failure(
              "The notification worker could not save this device. Try again.",
            ),
          );
        else resolve(event.data);
      };
      worker.postMessage({ type, ...(binding ? { binding } : {}) }, [
        channel.port2,
      ]);
    },
  );
}
async function activeRegistration() {
  const existing = await existingRegistration();
  const registration =
    existing ||
    (await navigator.serviceWorker.register(workerPath, {
      scope: "/",
      updateViaCache: "none",
    }));
  if (!ownWorker(registration))
    throw failure("The notification worker could not be verified.");
  if (!registration.active)
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) {
        reject(failure("The notification worker is not ready. Try again."));
        return;
      }
      const timer = setTimeout(() => {
        worker.removeEventListener("statechange", check);
        reject(
          failure("The notification worker is still starting. Try again."),
        );
      }, 7000);
      function check() {
        if (registration.active) {
          clearTimeout(timer);
          worker!.removeEventListener("statechange", check);
          resolve();
        } else if (worker!.state === "redundant") {
          clearTimeout(timer);
          worker!.removeEventListener("statechange", check);
          reject(failure("The notification worker did not start. Try again."));
        }
      }
      worker.addEventListener("statechange", check);
      check();
    });
  return registration;
}
function publicKeyBytes(value: string) {
  if (!/^[A-Za-z0-9_-]{87}$/.test(value))
    throw failure(
      "The notification public key is unavailable. Ask support to review server setup.",
    );
  const raw = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=");
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
function deviceLabel() {
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const device = /Android/.test(agent)
    ? "Android"
    : /iPhone|iPad/.test(agent)
      ? "iPhone or iPad"
      : /Windows/.test(agent)
        ? "Windows"
        : /Macintosh/.test(agent)
          ? "Mac"
          : /Linux/.test(agent)
            ? "Linux"
            : "this device";
  return `${browser} on ${device}`;
}
async function closeDisplayed(registration: ServiceWorkerRegistration) {
  try {
    for (const notification of await registration.getNotifications())
      notification.close();
  } catch {
    /* No notification contents are inspected or logged. */
  }
}
function bindingHeaders(binding?: Binding | null): Record<string, string> {
  return binding ? { "X-Servizato-Push-Binding": binding.bindingToken } : {};
}
async function withDeviceLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request)
    return navigator.locks.request("servizato.push.device.v1", action);
  return action();
}
function detachCurrent(version = generation, expectedOwner?: string | null) {
  return withDeviceLock(() => detachCurrentUnlocked(version, expectedOwner));
}
async function detachCurrentUnlocked(
  version = generation,
  expectedOwner?: string | null,
) {
  const registration = await existingRegistration();
  if (version !== generation) return;
  if (!registration) {
    saveOwner(null);
    return;
  }
  let binding: Binding | null = null;
  try {
    binding =
      (await workerMessage(registration, "SERVIZATO_PUSH_STATE")).binding ||
      null;
  } catch {
    /* Continue browser cleanup if the old worker is unavailable. */
  }
  if (
    version !== generation ||
    (expectedOwner && binding?.ownerId && binding.ownerId !== expectedOwner)
  )
    return;
  try {
    await workerMessage(
      registration,
      "SERVIZATO_PUSH_CLEAR",
      binding || undefined,
    );
  } catch {
    /* Resolver also rejects signed-out or changed accounts. */
  }
  if (version !== generation) return;
  try {
    const after = (await workerMessage(registration, "SERVIZATO_PUSH_STATE"))
      .binding;
    if (after && binding && after.bindingToken !== binding.bindingToken) return;
  } catch {
    /* Resolver remains authoritative if the worker is unavailable. */
  }
  if (version !== generation) return;
  await closeDisplayed(registration);
  const subscription = await registration.pushManager.getSubscription();
  if (version !== generation) return;
  if (subscription) await subscription.unsubscribe().catch(() => false);
  if (binding?.subscriptionId)
    await request(`/subscriptions/${binding.subscriptionId}`, {
      method: "DELETE",
      headers: bindingHeaders(binding),
    }).catch(() => undefined);
  saveOwner(null);
}
export function synchronizePushOwner(owner: string | null) {
  if (currentOwner !== owner) {
    currentOwner = owner;
    generation++;
  }
  const version = generation;
  cleanupPending = cleanupPending
    .catch(() => undefined)
    .then(async () => {
      if (version !== generation) return;
      let knownOwner = savedOwner();
      try {
        const registration = await existingRegistration();
        if (registration)
          knownOwner =
            (await workerMessage(registration, "SERVIZATO_PUSH_STATE")).binding
              ?.ownerId || knownOwner;
      } catch {
        /* Never replace an unrelated worker. */
      }
      if (
        version === generation &&
        (!owner || (knownOwner && knownOwner !== owner))
      )
        await detachCurrent(version, knownOwner).catch(() => undefined);
    });
  return cleanupPending;
}
export async function inspectPushDevice(
  owner: string,
): Promise<PushDeviceState> {
  const facts = browserPushFacts();
  const [config, saved] = await Promise.all([
    request<PushConfig>("/config"),
    request<{ devices: PushDevice[]; storageReady: boolean }>("/subscriptions"),
  ]);
  const state: PushDeviceState = {
    ...facts,
    hasSubscription: false,
    serverDevice: null,
    workerBound: false,
    keyMatches: null,
    config: {
      ...config,
      storageReady: config.storageReady && saved.storageReady,
    },
    devices: saved.devices,
  };
  if (!facts.supported || !facts.secureContext) return state;
  const registration = await existingRegistration();
  if (!registration) return state;
  const subscription = await registration.pushManager.getSubscription();
  state.hasSubscription = Boolean(subscription);
  if (subscription?.options.applicationServerKey && config.publicKey)
    state.keyMatches =
      new Uint8Array(subscription.options.applicationServerKey).join(",") ===
      publicKeyBytes(config.publicKey).join(",");
  if (subscription && state.config?.storageReady) {
    const current = await request<{
      device: PushDevice | null;
      binding: Binding | null;
    }>("/subscriptions/current", {
      method: "POST",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    state.serverDevice = current.device;
    // Merely inspecting never binds a worker or opts an account in.
    try {
      const binding = (
        await workerMessage(registration, "SERVIZATO_PUSH_STATE")
      ).binding;
      state.workerBound = Boolean(
        binding &&
          binding.ownerId === owner &&
          binding.subscriptionId === current.device?.id &&
          binding.bindingToken === current.binding?.bindingToken &&
          current.device.isActive,
      );
    } catch {
      state.workerBound = false;
    }
  }
  return state;
}
export async function enablePushDevice(owner: string) {
  const version = generation;
  assertOwner(owner, version);
  const facts = browserPushFacts();
  if (!facts.supported)
    throw failure(
      "This browser does not support Web Push. Your in-app notifications still work.",
    );
  if (!facts.secureContext)
    throw failure(
      "Browser notifications require HTTPS, or a supported localhost browser.",
    );
  // Keep this as the first awaited operation: permission must follow the user's click.
  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== "granted")
    throw failure(
      permission === "denied"
        ? "Browser permission is blocked. Change Notifications in this site's browser settings, then try again."
        : "Browser permission was not granted. You can enable notifications later in Settings.",
    );
  await bounded(
    cleanupPending.catch(() => undefined),
    8000,
    "Device cleanup is still finishing. Wait a moment and try enabling again.",
  );
  return withDeviceLock(async () => {
    assertOwner(owner, version);
    const config = await request<PushConfig>("/config");
    assertOwner(owner, version);
    if (
      !config.configured ||
      !config.storageReady ||
      !config.publicKey ||
      config.serviceWorkerPath !== workerPath
    )
      throw failure(
        "Browser notifications need server setup. In-app notifications still work.",
      );
    const key = publicKeyBytes(config.publicKey);
    const registration = await activeRegistration();
    assertOwner(owner, version);
    let subscription = await registration.pushManager.getSubscription();
    assertOwner(owner, version);
    const oldKey = subscription?.options.applicationServerKey;
    if (
      subscription &&
      oldKey &&
      new Uint8Array(oldKey).join(",") !== key.join(",")
    ) {
      if (!(await subscription.unsubscribe()))
        throw failure(
          "The old subscription could not be refreshed. Try again.",
        );
      subscription = null;
    }
    if (!subscription)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
    assertOwner(owner, version);
    const registered = await request<{ device: PushDevice; binding: Binding }>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceLabel: deviceLabel(),
        }),
      },
    );
    if (
      version !== generation ||
      owner !== currentOwner ||
      registered.binding?.ownerId !== owner
    ) {
      // Another tab may already own this browser endpoint. Do not destroy its subscription.
      throw failure(
        "Your account changed. Enable notifications again from the current account.",
      );
    }
    if (
      !registered.device?.isActive ||
      registered.binding.subscriptionId !== registered.device.id
    )
      throw failure(
        "The subscription was not confirmed. Refresh settings and try again.",
      );
    const confirmed = await request<{
      device: PushDevice | null;
      binding: Binding | null;
    }>("/subscriptions/current", {
      method: "POST",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    assertOwner(owner, version);
    if (
      confirmed.binding?.ownerId !== owner ||
      confirmed.binding.bindingToken !== registered.binding.bindingToken ||
      confirmed.device?.id !== registered.device.id
    )
      throw failure(
        "Your account connection changed. Refresh settings and enable again.",
      );
    try {
      await workerMessage(
        registration,
        "SERVIZATO_PUSH_BIND",
        registered.binding,
      );
    } catch {
      if (version === generation && owner === currentOwner) {
        const latest = (
          await workerMessage(registration, "SERVIZATO_PUSH_STATE").catch(
            () => ({ ok: false, binding: null }),
          )
        ).binding;
        if (
          !latest ||
          latest.bindingToken === registered.binding.bindingToken
        ) {
          await workerMessage(
            registration,
            "SERVIZATO_PUSH_CLEAR",
            registered.binding,
          ).catch(() => undefined);
          await subscription.unsubscribe().catch(() => false);
          await request(`/subscriptions/${registered.device.id}`, {
            method: "DELETE",
            headers: bindingHeaders(registered.binding),
          }).catch(() => undefined);
        }
      }
      throw failure(
        "This device could not finish enabling notifications. Refresh settings and try again.",
      );
    }
    assertOwner(owner, version);
    saveOwner(owner);
    clearDismissal(owner);
    changed();
  });
}
export function disablePushDevice(owner: string, deviceId?: string) {
  return withDeviceLock(() => disablePushDeviceUnlocked(owner, deviceId));
}
async function disablePushDeviceUnlocked(owner: string, deviceId?: string) {
  const version = generation;
  assertOwner(owner, version);
  const registration = await existingRegistration();
  assertOwner(owner, version);
  let id = deviceId;
  let expectedBinding: Binding | null = null;
  if (registration) {
    let binding: Binding | null = null;
    try {
      binding =
        (await workerMessage(registration, "SERVIZATO_PUSH_STATE")).binding ||
        null;
    } catch {
      /* Native unsubscribe and a known server device still allow safe disabling. */
    }
    assertOwner(owner, version);
    if (binding?.ownerId && binding.ownerId !== owner)
      throw failure(
        "Your account changed. Refresh notification settings before continuing.",
      );
    expectedBinding = binding;
    if (!id && binding?.ownerId === owner) id = binding.subscriptionId;
    await workerMessage(
      registration,
      "SERVIZATO_PUSH_CLEAR",
      binding || undefined,
    ).catch(() => undefined);
    assertOwner(owner, version);
    await closeDisplayed(registration);
    assertOwner(owner, version);
    const subscription = await registration.pushManager.getSubscription();
    assertOwner(owner, version);
    if (subscription && !(await subscription.unsubscribe()))
      throw failure(
        "This browser could not stop its subscription. Try again or change its site notification permission.",
      );
  }
  if (id)
    await request(`/subscriptions/${id}`, {
      method: "DELETE",
      headers: bindingHeaders(expectedBinding),
    });
  saveOwner(null);
  dismissPushPrompt(owner);
  changed();
}
export async function removePushDevice(owner: string, id: string) {
  assertOwner(owner);
  await request(`/subscriptions/${id}`, { method: "DELETE" });
  changed();
}
export async function signOut<R extends boolean = true>(
  options?: SignOutParams<R>,
) {
  const previousOwner = currentOwner || savedOwner();
  currentOwner = null;
  generation++;
  // A bounded cleanup attempt must never prevent ordinary NextAuth logout.
  const cleanup = detachCurrent(generation, previousOwner).catch(
    () => undefined,
  );
  cleanupPending = cleanup;
  await bounded(cleanup, 3500, "Notification cleanup timed out.").catch(
    () => undefined,
  );
  return nextAuthSignOut<R>(options);
}
