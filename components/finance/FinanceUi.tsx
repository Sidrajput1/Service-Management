"use client";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import type { FinanceAudit } from "@/lib/finance-types";
export const financeMoney = (paise: number = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    paise / 100,
  );
export const financeDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export const paymentLabels: Record<string, string> = {
  cash: "Cash paid to the service team",
  direct_upi: "UPI paid directly to the service team",
  servizato_online: "Online through Servizato",
};
export function financeError(error: unknown) {
  return isAxiosError(error) && typeof error.response?.data?.error === "string"
    ? error.response.data.error
    : error instanceof Error
      ? error.message
      : "The request could not be completed. Try again.";
}
export const fieldClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function FinanceState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  return loading ? (
    <div
      role="status"
      className="animate-pulse rounded-2xl border border-border bg-muted p-6"
    >
      Loading financial records…
    </div>
  ) : error ? (
    <div
      role="alert"
      className="space-y-3 rounded-2xl border border-destructive/30 p-5"
    >
      <p>Financial records could not be loaded. No amount has been assumed.</p>
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  ) : null;
}
export function AuditHistory({ events }: { events: FinanceAudit[] }) {
  return (
    <div className="space-y-3">
      {!events.length ? (
        <p className="text-sm text-muted-foreground">
          No recorded history yet.
        </p>
      ) : (
        events.map((event) => (
          <div
            key={event._id}
            className="rounded-xl border border-border p-4 text-sm"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium">{event.kind.replaceAll("_", " ")}</p>
              <time className="text-xs text-muted-foreground">
                {financeDate(event.createdAt)}
              </time>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Recorded by {event.actorRole}
              {event.actorId ? ` · ${event.actorId}` : ""}
            </p>
            {event.amountPaise != null && (
              <p className="mt-2 font-semibold">
                {financeMoney(event.amountPaise)}
              </p>
            )}
            {event.reason && (
              <p className="mt-2 break-words text-muted-foreground">
                {event.reason}
              </p>
            )}
            {event.reference && (
              <p className="mt-1 break-all text-xs">
                Reference: {event.reference}
              </p>
            )}
            {event.policy && (
              <pre className="mt-3 whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(event.policy, null, 2)}
              </pre>
            )}
          </div>
        ))
      )}
    </div>
  );
}
