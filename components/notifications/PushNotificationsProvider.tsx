"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebPushController, WebPushContext } from "@/hooks/useWebPush";

export function PushNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const push = useWebPushController();
  const showPrompt =
    push.authenticated &&
    !push.loading &&
    !push.dismissed &&
    !push.enabled &&
    push.facts.supported &&
    push.facts.secureContext &&
    push.facts.permission !== "denied" &&
    push.snapshot?.config?.configured &&
    push.snapshot.config.storageReady;
  return (
    <WebPushContext.Provider value={push}>
      {children}
      {showPrompt && (
        <aside
          aria-labelledby="push-opt-in-title"
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-lg sm:left-auto sm:right-5 sm:bottom-5 sm:mx-0"
        >
          <div className="flex items-start gap-3">
            <BellRing
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-primary"
            />
            <div className="min-w-0 flex-1">
              <h2 id="push-opt-in-title" className="text-sm font-semibold">
                Stay updated with Servizato
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Get important booking updates, job assignments and service
                status notifications on this device.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              onClick={push.dismissPrompt}
              aria-label="Dismiss notification invitation"
              disabled={push.busy}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {push.error && (
            <p role="alert" className="mt-3 text-xs leading-6 text-destructive">
              {push.error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11"
              onClick={() => void push.enable()}
              disabled={push.busy}
            >
              {push.busy ? "Enabling…" : "Enable notifications"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={push.dismissPrompt}
              disabled={push.busy}
            >
              Not now
            </Button>
          </div>
          <Link
            href="/notifications#push-settings"
            className="mt-3 inline-flex min-h-11 items-center text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Manage notification settings
          </Link>
        </aside>
      )}
    </WebPushContext.Provider>
  );
}
