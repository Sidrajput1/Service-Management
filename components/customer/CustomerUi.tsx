"use client";
import Link from "next/link";
import {
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Search,
  CalendarCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { proCopy } from "@/lib/customer-types";

export function CustomerPageHeading({
  eyebrow,
  title,
  description,
  back,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  back?: string;
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          href={back}
          className="mb-6 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      )}
      <p className="public-eyebrow">{eyebrow}</p>
      <h1 className="public-section-title mt-3">{title}</h1>
      {description && (
        <p className="mt-3 max-w-150 text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
export function CustomerState({
  loading,
  error,
  empty,
  retry,
  children,
  message,
  emptyFooter,
}: {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  retry?: () => void;
  children?: React.ReactNode;
  message?: string;
  emptyFooter?: React.ReactNode;
}) {
  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading your information"
        className="space-y-4"
      >
        <div className="h-12 w-2/3 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  if (error)
    return (
      <div className="public-catalog-state" role="alert">
        <RefreshCw className="size-7 text-primary" />
        <h2 className="text-lg font-semibold">
          We couldn’t load that right now
        </h2>
        <p>
          Your information may be temporarily unavailable. Please try again.
        </p>
        {retry && (
          <Button variant="outline" className="h-11 px-5" onClick={retry}>
            Try again <RefreshCw className="size-4" />
          </Button>
        )}
      </div>
    );
  if (empty)
    return (
      <>
        <div className="public-catalog-state">
          <CalendarCheck2 className="size-8 text-brand-teal-dark" />
          <h2 className="text-xl font-semibold">A little help starts here</h2>
          <p>
            {message ||
              "There’s nothing here yet. Your service information will appear when it’s available."}
          </p>
          <Link
            href="/services"
            className="public-button public-button-primary"
          >
            Explore services <Search className="size-4" />
          </Link>
        </div>
        {emptyFooter}
      </>
    );
  return children;
}
const labels: Record<string, string> = {
  open: "Awaiting provider",
  booked: "Accepted",
  confirmed: "Confirmed",
  assigned: "Pro assigned",
  enroute: "Pro on the way",
  arrived: "Pro has arrived",
  otp_verified: "Visit verified",
  in_progress: "Service in progress",
  on_hold: "On hold",
  scheduled: "Scheduled",
  issued: "Payment pending",
  partial: "Partly paid",
  draft: "Draft",
  paid: "Paid",
  cancelled: "Cancelled",
  declined: "Declined",
  expired: "Expired",
  upcoming: "Upcoming",
  active: "In progress",
  completed: "Completed",
  pending: "Pending",
  rescheduled: "Rescheduled",
  failed: "Failed",
};
export function StatusBadge({ status }: { status: string }) {
  const good = ["paid", "completed"].includes(status);
  const attention = ["cancelled", "declined", "failed", "expired"].includes(
    status,
  );
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${good ? "border-brand-teal/20 bg-secondary text-secondary-foreground" : attention ? "border-primary/15 bg-primary/6 text-primary" : "border-border bg-muted/60 text-foreground"}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {labels[status] || proCopy(status.replaceAll("_", " "))}
    </span>
  );
}
export function CursorPager({
  nextCursor,
  history,
  change,
}: {
  nextCursor?: string | null;
  history: string[];
  change: (history: string[]) => void;
}) {
  if (!nextCursor && !history.length) return null;
  return (
    <nav aria-label="Pagination" className="mt-7 flex justify-between gap-4">
      <Button
        variant="outline"
        className="h-11 px-5"
        disabled={!history.length}
        onClick={() => change(history.slice(0, -1))}
      >
        <ArrowLeft className="size-4" />
        Previous
      </Button>
      <span className="self-center text-xs text-muted-foreground">
        Page {history.length + 1}
      </span>
      <Button
        variant="outline"
        className="h-11 px-5"
        disabled={!nextCursor}
        onClick={() => nextCursor && change([...history, nextCursor])}
      >
        Next
        <ArrowRight className="size-4" />
      </Button>
    </nav>
  );
}
