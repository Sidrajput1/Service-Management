"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";

import { useProviderAssignedJobs } from "@/hooks/useProviderAssignedJobs";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const JOB_STATUS_OPTIONS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "assigned",
    label: "Assigned",
  },
  {
    value: "enroute",
    label: "On the way",
  },
  {
    value: "arrived",
    label: "Arrived",
  },
  {
    value: "otp_verified",
    label: "Verified",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "on_hold",
    label: "On Hold",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusClass(status: string) {
  switch (status) {
    case "assigned":
      return "bg-blue-50 text-blue-700 hover:bg-blue-50";

    case "enroute":
      return "bg-indigo-50 text-indigo-700 hover:bg-indigo-50";

    case "arrived":
      return "bg-amber-50 text-amber-700 hover:bg-amber-50";

    case "otp_verified":
      return "bg-violet-50 text-violet-700 hover:bg-violet-50";

    case "in_progress":
      return "bg-sky-50 text-sky-700 hover:bg-sky-50";

    case "on_hold":
      return "bg-orange-50 text-orange-700 hover:bg-orange-50";

    case "completed":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

    case "cancelled":
      return "bg-rose-50 text-rose-700 hover:bg-rose-50";

    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "assigned":
      return "Assigned";

    case "enroute":
      return "On the way";

    case "arrived":
      return "Arrived";

    case "otp_verified":
      return "Service verified";

    case "in_progress":
      return "In progress";

    case "on_hold":
      return "On hold";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
}

function getProgress(status: string) {
  switch (status) {
    case "assigned":
      return 20;

    case "enroute":
      return 40;

    case "arrived":
      return 55;

    case "otp_verified":
      return 70;

    case "in_progress":
      return 85;

    case "completed":
      return 100;

    case "on_hold":
      return 85;

    case "cancelled":
      return 0;

    default:
      return 10;
  }
}

export default function ProviderAssignedJobsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    isError,
  } = useProviderAssignedJobs(status);

  const jobs = data?.jobs || [];

  const filteredJobs = jobs.filter(
    (job: any) => {
      const value = search.trim().toLowerCase();

      if (!value) return true;

      const serviceName =
        job.bookingId?.serviceOfferingId?.name ||
        job.bookingId?.serviceType ||
        "";

      const customerName =
        job.bookingId?.customerId?.name ||
        "";

      const technicianName =
        job.technicianId?.userId?.name ||
        "";

      const city =
        job.bookingId?.address?.city ||
        "";

      return (
        serviceName.toLowerCase().includes(value) ||
        customerName.toLowerCase().includes(value) ||
        technicianName.toLowerCase().includes(value) ||
        city.toLowerCase().includes(value)
      );
    },
  );

  const stats = {
    total: jobs.length,

    assigned: jobs.filter(
      (job: any) => job.status === "assigned",
    ).length,

    active: jobs.filter((job: any) =>
      [
        "enroute",
        "arrived",
        "otp_verified",
        "in_progress",
        "on_hold",
      ].includes(job.status),
    ).length,

    completed: jobs.filter(
      (job: any) => job.status === "completed",
    ).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">
            Unable to load assigned jobs
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh the page and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">
              Operations
            </Badge>

            <h1 className="text-3xl font-semibold tracking-tight">
              Assigned Jobs
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Monitor technician execution from assignment
              through completion.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs text-slate-400">
              Active now
            </p>

            <p className="mt-1 text-2xl font-semibold">
              {stats.active}
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total jobs"
          value={stats.total}
          icon={Wrench}
        />

        <SummaryCard
          label="Assigned"
          value={stats.assigned}
          icon={UserRound}
        />

        <SummaryCard
          label="Active"
          value={stats.active}
          icon={Clock3}
        />

        <SummaryCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
        />
      </div>

      {/* Search + filters */}
      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search job, customer, technician..."
                className="h-11 rounded-xl pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {JOB_STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={
                    status === option.value
                      ? "default"
                      : "outline"
                  }
                  className="rounded-xl"
                  onClick={() =>
                    setStatus(option.value)
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job list */}
      {filteredJobs.length === 0 ? (
        <EmptyJobs />
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job: any) => (
            <JobCard
              key={job._id}
              job={job}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {label}
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {value}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCard({
  job,
}: {
  job: any;
}) {
  const booking = job.bookingId;
  const technician = job.technicianId;

  const service =
    booking?.serviceOfferingId?.name ||
    booking?.serviceType ||
    "Service";

  const customer =
    booking?.customerId?.name ||
    "Customer";

  const technicianName =
    technician?.userId?.name ||
    "Technician";

  const progress = getProgress(
    job.status,
  );

  const finalPrice =
    booking?.pricing?.finalPrice ||
    booking?.estimatedPrice ||
    0;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          {/* Main */}
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Wrench className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">
                  {service}
                </h2>

                <Badge
                  className={`rounded-full ${getStatusClass(
                    job.status,
                  )}`}
                >
                  {getStatusLabel(
                    job.status,
                  )}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  {customer}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" />
                  {technicianName}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {booking?.address?.city ||
                    "Location"}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {job.scheduledAt
                    ? new Date(
                        job.scheduledAt,
                      ).toLocaleString(
                        "en-IN",
                        {
                          dateStyle:
                            "medium",
                          timeStyle:
                            "short",
                        },
                      )
                    : "Flexible"}
                </span>
              </div>

              {/* Progress */}
              <div className="mt-4 max-w-2xl">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Job progress
                  </span>

                  <span className="text-xs font-medium">
                    {progress}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-slate-950 transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center justify-between gap-6 xl:justify-end">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Booking value
              </p>

              <p className="mt-1 text-lg font-semibold">
                {currency(
                  Number(finalPrice),
                )}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Payment:{" "}
                {job.paymentStatus ||
                  "unbilled"}
              </p>
            </div>

            <Button
              asChild
              className="rounded-xl"
            >
              <Link
                href={`/service-provider/assigned-jobs/${job._id}`}
              >
                View Job
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyJobs() {
  return (
    <Card className="rounded-3xl border-border/70">
      <CardContent className="p-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Wrench className="h-6 w-6 text-muted-foreground" />
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          No assigned jobs
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Jobs will appear here once you assign a technician
          to an accepted booking.
        </p>

        <Button
          asChild
          variant="outline"
          className="mt-5 rounded-xl"
        >
          <Link href="/service-provider/bookings">
            View Bookings
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}