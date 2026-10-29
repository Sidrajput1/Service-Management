"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LocateFixed, ShieldCheck, Smartphone, Square } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  watchJourney,
  type AcceptedJourneyUpdate,
} from "@/lib/journey-watch.mjs";
import {
  comingSoonHref,
  journeyStateInfo,
  offersAppInformation,
} from "@/lib/pro-tracking.mjs";
interface Journey {
  canTrack: boolean;
  destinationAvailable: boolean;
  clientIntervalMs: number;
  requiredReadings: number;
  radiusMeters: number;
}
export function ProJourney({
  jobId,
  status,
  journey,
}: {
  jobId: string;
  status: string;
  journey?: Journey;
}) {
  const { data: session, status: authStatus } = useSession(),
    client = useQueryClient();
  const owner = `${session?.user.id || "anonymous"}:${jobId}`;
  const [enabledFor, setEnabledFor] = useState<string | null>(null);
  const [observation, setObservation] = useState<{
    owner: string;
    state: string;
    accepted?: AcceptedJourneyUpdate;
  }>({ owner, state: "idle" });
  const eligible = Boolean(
    authStatus === "authenticated" &&
      session?.user.role === "technician" &&
      status === "enroute" &&
      journey?.canTrack,
  );
  const enabled = eligible && enabledFor === owner;
  const current =
    observation.owner === owner
      ? observation
      : { owner, state: "idle", accepted: undefined };
  useEffect(() => {
    if (enabledFor !== null && (enabledFor !== owner || !eligible))
      queueMicrotask(() =>
        setEnabledFor((value) => (value === enabledFor ? null : value)),
      );
  }, [eligible, enabledFor, owner]);
  const refresh = useCallback(() => {
    void client.invalidateQueries({ queryKey: ["technician-job", jobId] });
    void client.invalidateQueries({ queryKey: ["technician-jobs"] });
  }, [client, jobId]);
  useEffect(() => {
    if (!enabled || !eligible) return;
    let active = true;
    function updateState(next: string) {
      if (!active) return;
      setObservation((previous) => ({
        ...(previous.owner === owner ? previous : { owner }),
        state: next,
      }));
      if (
        [
          "denied",
          "unavailable",
          "timeout",
          "unsupported",
          "insecure",
          "paused",
          "ineligible",
          "arrived",
        ].includes(next)
      )
        setEnabledFor(null);
    }
    if (document.hidden) {
      queueMicrotask(() => {
        updateState("paused");
      });
      return () => {
        active = false;
      };
    }
    if (!window.isSecureContext || !navigator.geolocation) {
      queueMicrotask(() => {
        updateState(!window.isSecureContext ? "insecure" : "unsupported");
      });
      return () => {
        active = false;
      };
    }
    const controller = watchJourney({
      eligible,
      geolocation: navigator.geolocation,
      intervalMs: journey?.clientIntervalMs || 10000,
      onState: updateState,
      onAccepted: (accepted) => {
        if (active)
          setObservation((previous) => ({
            ...(previous.owner === owner
              ? previous
              : { owner, state: "reporting" }),
            accepted,
          }));
      },
      onArrival: refresh,
      send: async (reading: unknown, signal: AbortSignal) => {
        const response = await fetch(`/api/technician/jobs/${jobId}/location`, {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reading),
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw Object.assign(
            new Error("Location observation was not accepted"),
            { status: response.status },
          );
        return data;
      },
    });
    const visibility = () => {
      if (document.hidden) {
        controller.stop();
        updateState("paused");
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      controller.stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, eligible, jobId, journey?.clientIntervalMs, owner, refresh]);
  const missing = status === "enroute" && !journey?.destinationAvailable;
  // An old acknowledgement can remain in state after consent or eligibility ends.
  // Display active reporting only while this job still has the current user's consent.
  const liveState =
    (!enabled &&
      ["requesting", "reporting", "outside", "qualifying"].includes(
        current.state,
      )) ||
    (!current.accepted && ["outside", "qualifying"].includes(current.state))
      ? "idle"
      : current.state;
  const display =
    status === "arrived"
      ? "arrived"
      : !eligible && !missing
        ? "ineligible"
        : liveState;
  const information = journeyStateInfo(display);
  const tracking =
    enabled &&
    ["outside", "qualifying"].includes(display) &&
    Boolean(current.accepted);
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      aria-label="Automatic arrival detection"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LocateFixed className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Optional browser location
          </p>
          <h2 className="mt-1 text-base font-bold">
            {missing
              ? "Confirmed GPS destination unavailable"
              : information.title}
          </h2>
        </div>
        <span
          className={`ml-auto mt-1 size-2.5 shrink-0 rounded-full ${tracking ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 text-sm leading-7" role="status" aria-live="polite">
        {missing
          ? "This booking has no reliable customer-confirmed coordinates. Use the saved address for navigation and mark arrival manually."
          : information.text}
      </p>
      {current.accepted && (
        <dl className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              Last server-accepted update
            </dt>
            <dd className="mt-1 font-medium">
              <time
                dateTime={new Date(current.accepted.acceptedAt).toISOString()}
              >
                {new Date(current.accepted.acceptedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Accepted GPS accuracy</dt>
            <dd className="mt-1 font-medium">
              Within {Math.ceil(current.accepted.accuracyMeters)} metres
            </dd>
          </div>
        </dl>
      )}
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        Detection is optional. It needs your permission, a confirmed destination
        and multiple accurate GPS observations. It works while this page is
        visible; opening navigation, backgrounding or closing the browser can
        stop reporting. Map previews load separately and do not enable or
        disable GPS. It is a convenience, not proof of presence.
      </p>
      {display === "denied" && (
        <details className="mt-3 rounded-xl border border-border p-3 text-xs leading-6">
          <summary className="cursor-pointer font-semibold">
            How to allow location
          </summary>
          <p className="mt-2">
            Open this site’s permissions from your browser’s address bar or
            settings and allow Location. Then return here and retry. Your
            browser controls this setting; using the web job’s manual arrival
            action does not require GPS permission.
          </p>
        </details>
      )}
      {eligible && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            className="h-11"
            variant="outline"
            onClick={() => {
              setObservation((previous) => ({
                ...(previous.owner === owner ? previous : { owner }),
                state: enabled ? "idle" : "requesting",
              }));
              setEnabledFor(enabled ? null : owner);
            }}
          >
            {enabled ? (
              <Square className="size-4" aria-hidden="true" />
            ) : (
              <LocateFixed className="size-4" aria-hidden="true" />
            )}
            {enabled
              ? "Stop location observation"
              : ["idle", "ineligible"].includes(display)
                ? "Enable automatic arrival"
                : "Retry / resume location"}
          </Button>
        </div>
      )}
      {offersAppInformation(display) && (
        <div className="mt-4 border-t border-border pt-4">
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-11 whitespace-normal text-left"
          >
            <Link href={comingSoonHref(jobId)}>
              <Smartphone className="size-4 shrink-0" aria-hidden="true" />
              Servizato App — Coming Soon
            </Link>
          </Button>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            An informational page about the planned app. You can continue using
            this browser’s available job actions.
          </p>
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Only the server confirms arrival. Customer OTP still gates work.
      </p>
    </section>
  );
}
