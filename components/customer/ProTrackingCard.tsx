"use client";
import { MapPin, RefreshCw } from "lucide-react";
import { useProTracking, useTrackingClock } from "@/hooks/useProTracking";
import { dateTime } from "@/lib/customer-types";
export function ProTrackingCard({ bookingId, active }: { bookingId: string; active: boolean }) {
  const query = useProTracking(bookingId, active);
  const now = useTrackingClock();
  const age = query.data?.lastUpdated ? now - Date.parse(query.data.lastUpdated) : Infinity;
  const current = active && !query.isError && query.data?.state === "current" && age >= 0 && age <= 120000;
  return <section className="customer-panel"><h2 className="flex items-center gap-2 text-sm font-bold"><MapPin className="size-4 text-primary" />Pro location</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{!active ? "Location sharing is available only during an active job." : query.isLoading ? "Checking for a recent location…" : current ? "A recent location was received from your Pro. Location updates refresh periodically." : query.isError ? "Location updates are temporarily unavailable. Booking progress, messages, and payment remain available." : "A current location isn’t available. Follow the job status for the latest service progress."}</p>{current && query.data?.coordinates && <p className="mt-3 rounded-xl bg-secondary p-3 font-mono text-xs text-secondary-foreground">Lat {query.data.coordinates[1].toFixed(5)} · Lng {query.data.coordinates[0].toFixed(5)}</p>}{query.data?.lastUpdated && <p className="mt-3 text-xs text-muted-foreground">Last received: {dateTime(query.data.lastUpdated)}{!current && " · Not live"}</p>}{active && <button className="public-text-link mt-3" onClick={() => query.refetch()}><RefreshCw className="size-3.5" />Refresh location</button>}</section>;
}
