"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  CircleDot,
  FileImage,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTechnicianJobs } from "@/hooks/useTechnicianJobs";
import type { TechnicianJob } from "@/lib/technician-job-types";
import { technicianStatusLabel } from "@/lib/technician-workflow.mjs";
import { googleMapsLink } from "@/lib/map-links.mjs";

type ListedJob = TechnicianJob & { chatUnreadCount?: number };
type JobView =
  | "all"
  | "assigned"
  | "active"
  | "completed"
  | "paid"
  | "unbilled";
const emptyJobs: ListedJob[] = [];
const views: { value: JobView; label: string }[] = [
  { value: "all", label: "All jobs" },
  { value: "assigned", label: "Assigned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paid", label: "Paid" },
  { value: "unbilled", label: "Unbilled" },
];
const assignedStatuses = ["assigned", "scheduled"];
// Retain the legacy accepted value while covering the current journey states.
const activeStatuses = [
  "accepted",
  "enroute",
  "arrived",
  "otp_verified",
  "in_progress",
  "on_hold",
];
const statusStyles: Record<string, string> = {
  scheduled:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  assigned:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  accepted:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  enroute:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  arrived:
    "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
  otp_verified:
    "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200",
  in_progress:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  on_hold:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200",
};
const paymentLabels: Record<string, string> = {
  unbilled: "Unbilled",
  pending: "Pending",
  partial: "Part paid",
  paid: "Paid",
  refunded: "Refunded",
  not_required: "No payment required",
};
function jobStatus(job: ListedJob) {
  return (job.status || "").toLowerCase();
}
function paymentStatus(job: ListedJob) {
  return (job.paymentStatus || "unbilled").toLowerCase();
}
function matchesView(job: ListedJob, view: JobView) {
  switch (view) {
    case "assigned":
      return assignedStatuses.includes(jobStatus(job));
    case "active":
      return activeStatuses.includes(jobStatus(job));
    case "completed":
      return jobStatus(job) === "completed";
    case "paid":
      return paymentStatus(job) === "paid";
    // Match the existing unbilled filter, without treating absent data as a receipt.
    case "unbilled":
      return (job.paymentStatus || "").toLowerCase() === "unbilled";
    default:
      return true;
  }
}
function scheduledDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`max-w-full gap-1.5 whitespace-normal rounded-full px-2.5 py-1 text-left text-xs font-medium ${statusStyles[status] || "border-border bg-muted text-muted-foreground"}`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {technicianStatusLabel(status)}
    </Badge>
  );
}
async function copyJobId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success("Job ID copied");
  } catch {
    toast.error("Could not copy the job ID");
  }
}
function JobItem({ job }: { job: ListedJob }) {
  const booking = job.bookingId,
    customer = booking?.customerId,
    address = booking?.address;
  const date = scheduledDate(job.scheduledAt || booking?.scheduledAt);
  const location = [
    address?.addressLine,
    address?.locality,
    address?.city,
    address?.state,
    address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  const mapUrl = googleMapsLink(address, true);
  const service = booking?.serviceType || "Service job";
  const status = jobStatus(job),
    payment = paymentStatus(job);
  const proofCount = job.proofIds?.length || 0,
    unread = job.chatUnreadCount || 0;
  const estimate = booking?.estimatedPrice;
  return (
    <li className="min-w-0">
      <article
        aria-label={`${service}, job ${job._id}`}
        className="min-w-0 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5 xl:rounded-none xl:border-0 xl:bg-transparent xl:px-5 xl:py-5"
      >
        <div className="grid min-w-0 grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,.8fr)_auto] xl:items-center">
          <div className="order-1 col-span-2 min-w-0 xl:col-span-1">
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary"
              >
                <Wrench className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-semibold leading-6 text-foreground sm:text-base xl:text-sm">
                  {service}
                </h3>
                {booking?.subService && (
                  <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">
                    {booking.subService}
                  </p>
                )}
                <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <span title={job._id} className="min-w-0 truncate font-mono">
                    #{job._id.slice(-8).toUpperCase()}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Copy job ID ${job._id}`}
                    onClick={() => void copyJobId(job._id)}
                  >
                    <Copy aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            {(proofCount > 0 || unread > 0 || job.proofRequired) && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
                {(proofCount > 0 || job.proofRequired) && (
                  <span className="inline-flex items-center gap-1.5">
                    <FileImage
                      aria-hidden="true"
                      className="size-3.5 shrink-0"
                    />
                    {proofCount > 0
                      ? `${proofCount} proof ${proofCount === 1 ? "file" : "files"}`
                      : "Proof required"}
                  </span>
                )}
                {unread > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                    <MessageCircle
                      aria-hidden="true"
                      className="size-3.5 shrink-0"
                    />
                    {unread} unread
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="order-2 min-w-0">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground xl:sr-only">
              Scheduled
            </p>
            {date ? (
              <time
                dateTime={date.toISOString()}
                className="block text-sm leading-6"
              >
                <span className="block font-medium">
                  {date.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {date.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </time>
            ) : (
              <p className="text-sm text-muted-foreground">Not scheduled</p>
            )}
          </div>
          <div className="order-4 col-span-2 min-w-0 sm:order-3 sm:col-span-1">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground xl:sr-only">
              Customer & location
            </p>
            <p className="break-words text-sm font-medium leading-6">
              {customer?.name || "Customer unavailable"}
            </p>
            {customer?.phone && (
              <p className="break-words text-xs leading-5 text-muted-foreground">
                {customer.phone}
              </p>
            )}
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
              {location || "Address unavailable"}
            </p>
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Open location for ${service}, job ${job._id} (opens in a new tab)`}
              >
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                View location
              </a>
            )}
          </div>
          <div className="order-3 min-w-0 sm:order-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground xl:sr-only">
              Job status
            </p>
            <StatusBadge status={status} />
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
              Payment:{" "}
              <span
                className={
                  payment === "paid"
                    ? "font-medium text-emerald-700 dark:text-emerald-300"
                    : "text-foreground"
                }
              >
                {paymentLabels[payment] || payment.replaceAll("_", " ")}
              </span>
            </p>
            {typeof estimate === "number" && Number.isFinite(estimate) && (
              <p className="text-xs leading-5 text-muted-foreground">
                Estimate{" "}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 2,
                }).format(estimate)}
              </p>
            )}
          </div>
          <div className="order-5 col-span-2 flex min-w-0 items-end border-t border-border pt-4 sm:col-span-1 sm:justify-end xl:border-0 xl:pt-0">
            <Link
              href={`/technician/all-jobs/${job._id}`}
              aria-label={`Open ${service}, job ${job._id}`}
              className={buttonVariants({
                variant: "outline",
                className: "min-h-11 w-full gap-2 rounded-xl sm:w-auto xl:px-3",
              })}
            >
              Open job
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}
function JobsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading jobs"
      className="space-y-3 p-4 sm:p-5"
    >
      <span className="sr-only">Loading your assigned jobs…</span>
      {[0, 1, 2].map((index) => (
        <div
          aria-hidden="true"
          key={index}
          className="grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4 motion-reduce:animate-none" />
            <Skeleton className="h-3 w-1/2 motion-reduce:animate-none" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
            <Skeleton className="h-3 w-1/3 motion-reduce:animate-none" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full motion-reduce:animate-none" />
          <Skeleton className="h-11 w-full rounded-xl motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
export default function TechnicianJobsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { data, isLoading, isError, isFetching, error, refetch } =
    useTechnicianJobs();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<JobView>("all");
  const jobs = Array.isArray(data?.jobs)
    ? (data.jobs as ListedJob[])
    : emptyJobs;
  const canViewJobs =
    sessionStatus === "authenticated" && session?.user.role === "technician";
  const loading = sessionStatus === "loading" || (canViewJobs && isLoading);
  const errorStatus = (error as { response?: { status?: number } } | null)
    ?.response?.status;
  const accessDenied =
    sessionStatus !== "loading" &&
    (!canViewJobs || errorStatus === 401 || errorStatus === 403);
  const hasResponse = Array.isArray(data?.jobs);
  const failed = isError || (canViewJobs && data !== undefined && !hasResponse);
  const filtersActive = query.trim().length > 0 || view !== "all";
  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const customer = job.bookingId?.customerId;
      // Preserve the existing client-side search fields and substring matching.
      const address =
        job.bookingId?.address?.city ||
        job.bookingId?.address?.addressLine ||
        "";
      const searchable =
        `${customer?.name || ""} ${customer?.phone || ""} ${job.bookingId?.serviceType || ""} ${address} ${job.status || ""} ${job.paymentStatus || ""}`.toLowerCase();
      return (!q || searchable.includes(q)) && matchesView(job, view);
    });
  }, [jobs, query, view]);
  const overview = useMemo(
    () => [
      { label: "Total jobs", count: jobs.length, icon: ClipboardList },
      {
        label: "Assigned",
        count: jobs.filter((job) => matchesView(job, "assigned")).length,
        icon: CalendarDays,
      },
      {
        label: "Active",
        count: jobs.filter((job) => matchesView(job, "active")).length,
        icon: CircleDot,
      },
      {
        label: "Completed",
        count: jobs.filter((job) => matchesView(job, "completed")).length,
        icon: CheckCircle2,
      },
    ],
    [jobs],
  );
  function clearFilters() {
    setQuery("");
    setView("all");
  }
  return (
    <div className="min-w-0 space-y-5 pb-4">
      <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            Your assignments
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            All Jobs
          </h1>
        </div>
        {!accessDenied && (
          <Button
            type="button"
            variant="outline"
            disabled={loading || isFetching}
            onClick={() => void refetch()}
            className="size-11 gap-2 rounded-xl p-0 sm:w-auto sm:px-3"
            aria-label="Refresh jobs"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${isFetching ? "motion-safe:animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {isFetching && !loading ? "Refreshing…" : "Refresh"}
            </span>
          </Button>
        )}
        <p className="col-span-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review your assigned jobs and open a job to continue the service.
        </p>
      </header>
      {accessDenied ? (
        <section
          role="alert"
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <ShieldAlert
            aria-hidden="true"
            className="mb-4 size-6 text-primary"
          />
          <h2 className="font-semibold">
            {sessionStatus === "unauthenticated" || errorStatus === 401
              ? "Sign in to view your jobs"
              : "Technician account required"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Use an active technician account to access its assigned jobs. Your
            job access is checked by the server.
          </p>
          <Link
            href="/signin"
            className={buttonVariants({
              className: "mt-5 min-h-11 rounded-xl",
            })}
          >
            Go to sign in
          </Link>
        </section>
      ) : (
        <>
          <section
            aria-label="Overview of all your assigned jobs"
            className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {overview.map(({ label, count, icon: Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 sm:px-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <Icon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </div>
                {loading ? (
                  <Skeleton className="mt-3 h-7 w-10 motion-reduce:animate-none" />
                ) : (
                  <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                    {hasResponse && !failed ? count : "—"}
                  </p>
                )}
              </div>
            ))}
          </section>
          <section
            aria-label="Search and filter jobs"
            className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div className="min-w-0">
                <label
                  htmlFor="technician-job-search"
                  className="mb-2 block text-xs font-medium"
                >
                  Search jobs
                </label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="technician-job-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Service, customer, phone or city"
                    className="h-11 min-w-0 rounded-xl pl-10"
                    aria-controls="technician-job-list"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="technician-job-view"
                  className="mb-2 block text-xs font-medium"
                >
                  Job view
                </label>
                <select
                  id="technician-job-view"
                  value={view}
                  onChange={(event) => setView(event.target.value as JobView)}
                  aria-controls="technician-job-list"
                  className="h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {views.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filtersActive && (
              <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2">
                <p className="min-w-0 break-words text-xs leading-6 text-muted-foreground">
                  {view !== "all"
                    ? `${views.find((option) => option.value === view)?.label} jobs`
                    : "All job statuses"}
                  {query.trim() ? ` · Search: “${query.trim()}”` : ""}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFilters}
                  className="min-h-11 shrink-0 gap-1.5 rounded-lg px-2 text-xs"
                >
                  <X aria-hidden="true" className="size-3.5" />
                  Clear filters
                </Button>
              </div>
            )}
          </section>
          {failed && (
            <section
              role="alert"
              className="flex min-w-0 flex-wrap items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4"
            >
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-destructive"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">
                  {hasResponse && jobs.length > 0
                    ? "Couldn’t refresh your jobs"
                    : "Couldn’t load your jobs"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {hasResponse && jobs.length > 0
                    ? "Showing the last loaded jobs. Refresh before relying on the latest assignment details."
                    : "Your jobs are unavailable right now. Try again to load your assignments."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                  className="mt-3 min-h-11 rounded-xl"
                >
                  Try again
                </Button>
              </div>
            </section>
          )}
          <section
            aria-labelledby="technician-job-list-heading"
            aria-busy={loading || isFetching}
            className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-5">
              <h2
                id="technician-job-list-heading"
                className="text-sm font-semibold"
              >
                Your jobs
              </h2>
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="text-xs leading-5 text-muted-foreground"
              >
                {loading
                  ? "Loading jobs…"
                  : failed && jobs.length === 0
                    ? "Jobs unavailable"
                    : hasResponse
                      ? `${filteredJobs.length} of ${jobs.length} jobs · Newest first`
                      : "Jobs unavailable"}
              </p>
            </div>
            {loading ? (
              <JobsSkeleton />
            ) : failed && jobs.length === 0 ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">
                Use Try again above to reload your jobs.
              </div>
            ) : filteredJobs.length === 0 ? (
              <div
                id="technician-job-list"
                className="flex flex-col items-center px-5 py-12 text-center sm:py-16"
              >
                {filtersActive ? (
                  <SearchX
                    aria-hidden="true"
                    className="mb-4 size-8 text-muted-foreground"
                  />
                ) : (
                  <ClipboardList
                    aria-hidden="true"
                    className="mb-4 size-8 text-muted-foreground"
                  />
                )}
                <h3 className="font-semibold">
                  {filtersActive ? "No matching jobs" : "No jobs assigned yet"}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {filtersActive
                    ? "Try a different search or clear your filters to see all assigned jobs."
                    : "Jobs assigned to your technician account will appear here. Check back or refresh for new assignments."}
                </p>
                {filtersActive && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-5 min-h-11 rounded-xl"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,.8fr)_auto] items-center gap-5 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground xl:grid"
                >
                  <span>Job & service</span>
                  <span>Scheduled</span>
                  <span>Customer & location</span>
                  <span>Status & payment</span>
                  <span className="w-[108px] text-right">Details</span>
                </div>
                <ul
                  id="technician-job-list"
                  className="grid min-w-0 gap-3 bg-muted/20 p-3 xl:divide-y xl:divide-border xl:gap-0 xl:bg-card xl:p-0"
                >
                  {filteredJobs.map((job) => (
                    <JobItem key={job._id} job={job} />
                  ))}
                </ul>
              </>
            )}
          </section>
          <p className="px-1 text-xs leading-6 text-muted-foreground">
            Overview counts include all jobs assigned to you. Search and filters
            change the list below; they do not change a job’s status.
          </p>
        </>
      )}
    </div>
  );
}
