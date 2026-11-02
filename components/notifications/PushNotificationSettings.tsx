"use client";

import {
  BellRing,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/useWebPush";

function deviceDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}
export function PushNotificationSettings() {
  const push = useWebPush(),
    state = push.snapshot;
  if (!push.authenticated) return null;
  let title = "Not enabled",
    message =
      "Enable browser notifications to receive important updates on this device.";
  if (!push.facts.supported) {
    title = "Unsupported browser or device";
    message =
      "This browser does not offer the required Web Push features. You can continue using in-app notifications.";
  } else if (!push.facts.secureContext) {
    title = "A secure connection is required";
    message =
      "Use Servizato over HTTPS, or a supported localhost browser for development.";
  } else if (push.facts.permission === "denied") {
    title = "Browser permission blocked";
    message =
      "Open this site's Notifications setting in your browser and allow notifications. Servizato cannot change this permission for you.";
  } else if (
    state &&
    (!state.config?.configured || !state.config.storageReady)
  ) {
    title = "Server setup is pending";
    message =
      "Browser notifications are not configured on this server yet. Existing in-app notifications still work.";
  } else if (push.error) {
    title = "Status could not be confirmed";
    message =
      "Refresh settings before relying on the last saved device information.";
  } else if (push.enabled) {
    title = "Enabled on this device";
    message =
      "This browser and your current account are connected for push notifications.";
  } else if (state?.hasSubscription) {
    title = "Subscription needs to be refreshed";
    message =
      "This browser has a subscription, but its account connection or notification key needs to be refreshed. Use Enable or refresh to confirm this account.";
  } else if (push.facts.permission === "granted") {
    title = "Permission granted, device not enabled";
    message =
      "Your browser allows notifications. Select Enable to connect this device to the current account.";
  }
  const setupReady = Boolean(
    state?.config?.configured && state.config.storageReady,
  );
  const canEnable =
    !push.loading &&
    !push.busy &&
    push.facts.supported &&
    push.facts.secureContext &&
    push.facts.permission !== "denied" &&
    setupReady &&
    !push.enabled;
  return (
    <section
      id="push-settings"
      aria-labelledby="push-settings-title"
      className="mb-6 scroll-mt-24 space-y-5 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <BellRing
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-primary"
          />
          <div>
            <h2 id="push-settings-title" className="font-semibold">
              Browser notification settings
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
              Choose which devices receive push. Your in-app notifications and
              live updates work independently.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => void push.refresh()}
          disabled={push.loading || push.busy}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Refresh status
        </Button>
      </div>
      {push.loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking this device and your saved settings…
        </p>
      )}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">
          {push.loading && !state ? "Checking notification support" : title}
        </h3>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {message}
        </p>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Browser permission</dt>
            <dd className="mt-1 font-medium">
              {push.facts.permission === "default"
                ? "Not requested"
                : push.facts.permission === "granted"
                  ? "Allowed"
                  : push.facts.permission === "denied"
                    ? "Blocked in browser"
                    : "Unsupported"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Browser subscription</dt>
            <dd className="mt-1 font-medium">
              {!state || push.error
                ? "Not checked"
                : state.hasSubscription
                  ? "Present"
                  : "Not present"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              Current account connection
            </dt>
            <dd className="mt-1 font-medium">
              {!state || push.error
                ? "Not confirmed"
                : state.serverDevice?.isActive && state.workerBound
                  ? "Active"
                  : state.serverDevice?.isActive
                    ? "Needs refresh"
                    : "Not active"}
            </dd>
          </div>
        </dl>
      </div>
      {push.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6"
        >
          {push.error}
        </p>
      )}
      {push.feedback && (
        <p role="status" className="text-sm leading-6 text-muted-foreground">
          {push.feedback}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          onClick={() => void push.enable()}
          disabled={!canEnable}
        >
          {push.busy
            ? "Updating…"
            : state?.hasSubscription
              ? "Enable or refresh this device"
              : "Enable notifications"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => void push.disable()}
          disabled={
            push.loading ||
            push.busy ||
            !state ||
            (!state.hasSubscription && !state.serverDevice?.isActive)
          }
        >
          Disable on this device
        </Button>
      </div>
      <div className="space-y-3 border-t border-border pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MonitorSmartphone aria-hidden="true" className="size-4" />
          Registered devices
        </h3>
        {!state ? (
          <p className="text-xs leading-6 text-muted-foreground">
            Your device list is unavailable until settings can be checked.
          </p>
        ) : !state.config?.storageReady ? (
          <p className="text-xs leading-6 text-muted-foreground">
            Device storage needs server setup.
          </p>
        ) : state.devices.length === 0 ? (
          <p className="text-xs leading-6 text-muted-foreground">
            No devices are registered to this account.
          </p>
        ) : (
          <ul className="space-y-3">
            {state.devices.map((device) => (
              <li
                key={device.id}
                className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">
                    {device.deviceLabel || "Browser device"}
                    {device.id === state.serverDevice?.id && (
                      <span className="ml-2 text-xs text-primary">
                        This browser
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {device.isActive ? "Active" : "Disabled"}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Registered {deviceDate(device.createdAt)}
                    <br />
                    Last seen{" "}
                    {deviceDate(device.lastSeenAt || device.updatedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={push.busy || !device.isActive}
                  onClick={() => void push.removeDevice(device.id)}
                  aria-label={`Disable ${device.deviceLabel || "browser device"}`}
                >
                  Disable device
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0" />
        Device labels are best-effort browser descriptions. Push delivery
        depends on your browser, connection and operating-system settings.
        Disabling push does not revoke browser permission or remove in-app
        notification history.
      </p>
    </section>
  );
}
