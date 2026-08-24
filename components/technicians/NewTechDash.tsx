"use client";

import { useMemo, useState } from "react";

import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  User2,
  Wrench,
  Zap,
} from "lucide-react";

import {
  useAcceptTechnicianJob,
  useTechnicianJobs,
} from "@/hooks/useTechnicianJobs";

import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";

function formatDate(date?: string | Date | null) {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function getInitials(name?: string) {
  if (!name) return "J";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isActiveJob(status?: string) {
  return [
    "accepted",
    "enroute",
    "arrived",
    "otp_verified",
    "in_progress",
    "on_hold",
  ].includes((status || "").toLowerCase());
}

function needsAcceptance(status?: string) {
  return ["assigned", "scheduled"].includes((status || "").toLowerCase());
}

function isCompleted(status?: string) {
  return status === "completed";
}

function statusBadge(status?: string) {
  const value = (status || "").toLowerCase();

  if (value === "completed") {
    return (
      <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Completed
      </Badge>
    );
  }

  if (
    [
      "accepted",
      "enroute",
      "arrived",
      "otp_verified",
      "in_progress",
      "on_hold",
    ].includes(value)
  ) {
    return (
      <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-400">
        <Activity className="mr-1 h-3.5 w-3.5" />
        Active
      </Badge>
    );
  }

  if (["assigned", "scheduled"].includes(value)) {
    return (
      <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        <Clock3 className="mr-1 h-3.5 w-3.5" />
        Action required
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
      {status || "New"}
    </Badge>
  );
}

function JobCard({
  job,
  onOpen,
  onAccept,
  accepting,
}: {
  job: any;
  onOpen: () => void;
  onAccept: () => void;
  accepting: boolean;
}) {
  const customer = job.bookingId?.customerId;

  const customerName = customer?.name || "Customer";

  const service = job.bookingId?.serviceType || "Service job";

  const city =
    job.bookingId?.address?.city ||
    job.bookingId?.address?.addressLine ||
    "Location unavailable";

  const active = isActiveJob(job.status);

  const assigned = needsAcceptance(job.status);

  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        active && "border-cyan-500/30 ring-1 ring-cyan-500/10",
        assigned && "border-amber-500/30 ring-1 ring-amber-500/10",
      )}
    >
      <CardContent className="p-5">
        {/* Top */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 border border-border">
              <AvatarFallback className="bg-muted font-semibold text-foreground">
                {getInitials(customerName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {service}
              </p>

              <p className="truncate text-sm text-muted-foreground">
                {customerName}
              </p>
            </div>
          </div>

          {statusBadge(job.status)}
        </div>

        {/* Assignment alert */}
        {assigned && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  New job assigned
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Review the booking and accept the job to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active message */}
        {active && (
          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
                <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">
                  Job in progress
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Continue the workflow from where you stopped.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>

            <p className="mt-1 truncate text-sm font-medium text-foreground">
              {city}
            </p>
          </div>

          <div className="rounded-2xl bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule
            </div>

            <p className="mt-1 text-sm font-medium text-foreground">
              {formatDate(job.scheduledAt)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {assigned ? (
            <Button
              type="button"
              className="h-11 flex-1 rounded-2xl bg-amber-600 text-white hover:bg-amber-700"
              onClick={onAccept}
              disabled={accepting}
            >
              {accepting ? "Accepting..." : "Accept job"}
              <ArrowRight className="ml-2 h-4 w-4 inline" />
            </Button>
          ) : (
            <Button
              type="button"
              className={cn(
                "h-11 flex-1 rounded-2xl",
                active ? "bg-cyan-600 text-white hover:bg-cyan-700" : "",
              )}
              onClick={onOpen}
            >
              {active ? "Continue workflow" : "Open job"}
              <ArrowRight className="ml-2 h-4 w-4 inline" />
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-2xl"
            onClick={onOpen}
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewTechDash({ session }: { session: any }) {
  const router = useRouter();

  const { data, isLoading, refetch } = useTechnicianJobs();

  const acceptJob = useAcceptTechnicianJob();

  const [search, setSearch] = useState("");

  const jobs = data?.jobs || [];

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return jobs;
    }

    return jobs.filter((job: any) => {
      const service = job.bookingId?.serviceType || "";

      const customer = job.bookingId?.customerId?.name || "";

      const phone = job.bookingId?.customerId?.phone || "";

      const city = job.bookingId?.address?.city || "";

      return `${service} ${customer} ${phone} ${city}`
        .toLowerCase()
        .includes(query);
    });
  }, [jobs, search]);

  const activeJobs = filteredJobs.filter((job: any) => isActiveJob(job.status));

  const assignedJobs = filteredJobs.filter((job: any) =>
    needsAcceptance(job.status),
  );

  const upcomingJobs = filteredJobs.filter(
    (job: any) =>
      !isActiveJob(job.status) &&
      !needsAcceptance(job.status) &&
      !isCompleted(job.status),
  );

  const completedJobs = filteredJobs.filter((job: any) =>
    isCompleted(job.status),
  );

  /*
   * Priority:
   * 1. Active
   * 2. Needs acceptance
   * 3. Upcoming
   */
  const priorityJob =
    activeJobs[0] || assignedJobs[0] || upcomingJobs[0] || null;

  const handleAccept = async (jobId: string) => {
    try {
      await acceptJob.mutateAsync(jobId);

      await refetch();

      router.push(`/technician/all-jobs/${jobId}`);
    } catch (error: any) {
      console.error("Accept job error:", error);
    }
  };

  if (!session?.user) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Technician workspace
            </div>

            <h1 className="mt-4 font-poppins text-3xl font-semibold tracking-tight sm:text-4xl">
              Good work, {session.user.name || "Technician"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Your jobs are organized by priority. Continue an active job or
              accept your next assignment.
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => refetch()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      {/* Continue working */}
      {priorityJob && (
        <Card
          className={cn(
            "overflow-hidden rounded-3xl shadow-sm",
            activeJobs.length > 0
              ? "border-cyan-500/25 bg-cyan-500/5"
              : "border-amber-500/25 bg-amber-500/5",
          )}
        >
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    activeJobs.length > 0
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {activeJobs.length > 0 ? (
                    <Activity className="h-5 w-5" />
                  ) : (
                    <ClipboardList className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {activeJobs.length > 0
                        ? "Continue active job"
                        : "Action required"}
                    </p>

                    {statusBadge(priorityJob.status)}
                  </div>

                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                    {priorityJob.bookingId?.serviceType || "Service job"}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {priorityJob.bookingId?.customerId?.name || "Customer"}
                    {" · "}
                    {priorityJob.bookingId?.address?.city || "Location"}
                  </p>
                </div>
              </div>

              <Button
                className={cn(
                  "h-11 rounded-2xl px-6",
                  activeJobs.length > 0
                    ? "bg-cyan-600 text-white hover:bg-cyan-700"
                    : "bg-amber-600 text-white hover:bg-amber-700",
                )}
                onClick={() => {
                  if (needsAcceptance(priorityJob.status)) {
                    handleAccept(priorityJob._id);
                  } else {
                    router.push(`/technician/all-jobs/${priorityJob._id}`);
                  }
                }}
                disabled={acceptJob.isPending}
              >
                {needsAcceptance(priorityJob.status)
                  ? acceptJob.isPending
                    ? "Accepting..."
                    : "Accept & start"
                  : "Continue workflow"}

                <ArrowRight className="ml-2 h-4 w-4 inline" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search service, customer, phone or city..."
              className="h-11 rounded-2xl pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-3xl bg-muted"
            />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Wrench className="h-6 w-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-semibold text-foreground">
              No jobs found
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              New assignments will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Assigned */}
          {assignedJobs.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Needs your action
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Accept these assigned jobs to start.
                  </p>
                </div>

                <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {assignedJobs.length}
                </Badge>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {assignedJobs.map((job: any) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    onOpen={() => router.push(`/technician/all-jobs/${job._id}`)}
                    onAccept={() => handleAccept(job._id)}
                    accepting={acceptJob.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active */}
          {activeJobs.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Active jobs
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Continue the workflow for jobs already in progress.
                  </p>
                </div>

                <Badge className="rounded-full border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
                  {activeJobs.length}
                </Badge>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {activeJobs.map((job: any) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    onOpen={() => router.push(`/technician/all-jobs/${job._id}`)}
                    onAccept={() => router.push(`/technician/all-jobs/${job._id}`)}
                    accepting={false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcomingJobs.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Upcoming
                </h2>
                <p className="text-sm text-muted-foreground">
                  Jobs waiting for their execution window.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {upcomingJobs.map((job: any) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    onOpen={() => router.push(`/technician/all-jobs/${job._id}`)}
                    onAccept={() => router.push(`/technician/all-jobs/${job._id}`)}
                    accepting={false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completedJobs.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Recently completed
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your latest finished jobs.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {completedJobs.slice(0, 4).map((job: any) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    onOpen={() => router.push(`/technician/all-jobs/${job._id}`)}
                    onAccept={() => router.push(`/technician/all-jobs/${job._id}`)}
                    accepting={false}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
