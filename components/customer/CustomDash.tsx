"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  CreditCard,
  FileText,
  Headphones,
  History,
  Home,
  MapPin,
  MessageSquare,
  PhoneCall,
  PlusCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
  Wrench,
  Star,
} from "lucide-react";



import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCustomerDashboard } from "@/hooks/useCustomer";
import JobChatPanel from "../chat/JobChatPanel";

function formatDate(date?: string | Date | null) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatDateOnly(date?: string | Date | null) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

function getInitials(name?: string) {
  if (!name) return "C";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getStatusBadge(status?: string) {
  const value = (status || "new").toLowerCase();

  if (value.includes("completed") || value.includes("done")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Completed
      </Badge>
    );
  }

  if (value.includes("cancel")) {
    return (
      <Badge className="rounded-full border-rose-500/20 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400">
        Cancelled
      </Badge>
    );
  }

  if (value.includes("progress") || value.includes("active")) {
    return (
      <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400">
        In Progress
      </Badge>
    );
  }

  if (value.includes("confirm")) {
    return (
      <Badge className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/10 dark:text-violet-400">
        Confirmed
      </Badge>
    );
  }

  if (value.includes("pending")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        Pending
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
      {status || "New"}
    </Badge>
  );
}

function getPaymentBadge(status?: string) {
  const value = (status || "unbilled").toLowerCase();

  if (value.includes("paid")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Paid
      </Badge>
    );
  }

  if (value.includes("pending")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        Pending
      </Badge>
    );
  }

  if (value.includes("billed")) {
    return (
      <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400">
        Billed
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
      Unbilled
    </Badge>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  note,
}: {
  title: string;
  value: string;
  icon: any;
  note?: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </div>
            {note ? <div className="mt-1 text-sm text-muted-foreground">{note}</div> : null}
          </div>
          <div className="rounded-2xl border border-border bg-muted/50 p-3">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-auto w-full justify-start rounded-3xl border-border bg-background p-4 text-left hover:bg-muted/40"
    >
      <Link href={href} className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/40">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
      </Link>
    </Button>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: any;
}) {
  return (
    <div className="flex min-h-70 items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50">
          {Icon ? <Icon className="h-6 w-6 text-muted-foreground" /> : <Bell className="h-6 w-6 text-muted-foreground" />}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-2xl bg-muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-3 w-64 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-3 w-56 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTechnicianName(job: any) {
  const technician = job?.technicianId;
  if (!technician) return "Assigned later";

  if (typeof technician === "string") return "Assigned technician";
  if (typeof technician?.userId === "object" && technician.userId) {
    return technician.userId.name || technician.userId.email || "Assigned technician";
  }

  return technician.name || "Assigned technician";
}

function getTechnicianPhone(job: any) {
  const technician = job?.technicianId;
  if (!technician || typeof technician === "string") return "-";
  if (typeof technician?.userId === "object" && technician.userId) {
    return technician.userId.phone || "-";
  }
  return "-";
}

function getJobProgress(status?: string) {
  const value = (status || "").toLowerCase();

  if (value.includes("completed")) return 5;
  if (value.includes("in_progress") || value.includes("progress")) return 4;
  if (value.includes("arrived")) return 3;
  if (value.includes("accepted")) return 2;
  if (value.includes("assigned") || value.includes("scheduled")) return 1;
  return 0;
}

function ProgressPill({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 text-center text-sm font-medium transition ${
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "border-border bg-background text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

export default function CustomDash({ session }: any) {
  const { data, isLoading, refetch } = useCustomerDashboard();

  console.log("Customer Dashboard data:", data);

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [search, setSearch] = useState("");

  const summary = data?.summary || {};
  const requests = data?.requests || [];
  const jobs = data?.jobs || [];

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((req: any) => {
      const service = req.serviceRequested || "";
      const remarks = req.remarks || "";
      const status = req.status || "";
      return `${service} ${remarks} ${status}`.toLowerCase().includes(q);
    });
  }, [requests, search]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job: any) => {
      const service = job.bookingId?.serviceType || "";
      const tech = getTechnicianName(job);
      const customer = job.bookingId?.customerId?.name || "";
      const status = job.status || "";
      const payment = job.paymentStatus || "";
      return `${service} ${tech} ${customer} ${status} ${payment}`.toLowerCase().includes(q);
    });
  }, [jobs, search]);

  const activeJob = useMemo(() => {
    const fromSelection = jobs.find((job: any) => job._id === selectedJobId);
    if (fromSelection) return fromSelection;

    const nonCompleted = jobs.find((job: any) => (job.status || "").toLowerCase() !== "completed");
    return nonCompleted || jobs[0] || null;
  }, [jobs, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId && activeJob?._id) {
      setSelectedJobId(activeJob._id);
    }
    if (selectedJobId && !jobs.some((job: any) => job._id === selectedJobId)) {
      setSelectedJobId(activeJob?._id || "");
    }
  }, [activeJob, jobs, selectedJobId]);

  const activeJobs = useMemo(
    () =>
      jobs.filter((job: any) => {
        const value = (job.status || "").toLowerCase();
        return ["assigned", "scheduled", "accepted", "arrived", "in_progress", "on_hold"].includes(value);
      }),
    [jobs],
  );

  const completedJobs = useMemo(
    () => jobs.filter((job: any) => (job.status || "").toLowerCase() === "completed"),
    [jobs],
  );

  const pendingInvoicesCount = Number(summary.pendingInvoices || 0);
  const totalRequests = Number(summary.totalRequests || requests.length || 0);
  const activeJobsCount = Number(summary.activeJobs || activeJobs.length || 0);
  const completedJobsCount = Number(summary.completedJobs || completedJobs.length || 0);

  const serviceHistory = useMemo(() => {
    return [...completedJobs]
      .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5);
  }, [completedJobs]);

  const currentTechName = activeJob ? getTechnicianName(activeJob) : "Assigned later";
  const currentTechPhone = activeJob ? getTechnicianPhone(activeJob) : "-";
  const currentCustomerName = activeJob?.bookingId?.customerId?.name || "Customer";
  const currentService = activeJob?.bookingId?.serviceType || "Service";
  const currentStatus = activeJob?.status || "new";
  const currentPayment = activeJob?.paymentStatus || "unbilled";
  const currentAddress =
    activeJob?.bookingId?.address?.addressLine ||
    activeJob?.bookingId?.customerId?.addresses?.[0]?.addressLine ||
    "-";
  const currentCity =
    activeJob?.bookingId?.address?.city ||
    activeJob?.bookingId?.customerId?.addresses?.[0]?.city ||
    "-";
  const currentPincode =
    activeJob?.bookingId?.address?.pincode ||
    activeJob?.bookingId?.customerId?.addresses?.[0]?.pincode ||
    "-";
  const progress = activeJob ? getJobProgress(activeJob.status) : 0;

  if (!session?.user) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8 bg-background text-foreground">
      {/* Hero */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border/70 bg-muted/30 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Customer portal
                </div>

                <div className="space-y-2">
                  <h1 className="font-poppins text-3xl font-semibold tracking-tight sm:text-4xl">
                    Welcome back, {session.user.name || "Customer"} 👋
                  </h1>
                  <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                    Book services, track technicians, review requests, and manage payments from one clean dashboard.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90">
                  <Link href="/customer/book-service">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Book service
                  </Link>
                </Button>

                <Button variant="outline" className="h-11 rounded-2xl" onClick={() => refetch?.()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending invoice alert */}
      {pendingInvoicesCount > 0 ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-white dark:border-amber-900/40 dark:bg-amber-950/40">
                <CreditCard className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  You have {pendingInvoicesCount} pending invoice{pendingInvoicesCount > 1 ? "s" : ""}
                </div>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  Pay on time to avoid service delays and keep your account updated.
                </p>
              </div>
            </div>

            <Button asChild className="h-11 rounded-2xl bg-amber-600 text-white hover:bg-amber-700">
              <Link href="/customer/invoices">
                View invoices
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Requests"
          value={String(totalRequests)}
          icon={ClipboardList}
          note="All service requests"
        />
        <StatCard
          title="Active Jobs"
          value={String(activeJobsCount)}
          icon={Wrench}
          note="Technician work in progress"
        />
        <StatCard
          title="Completed Jobs"
          value={String(completedJobsCount)}
          icon={CalendarDays}
          note="Finished services"
        />
        <StatCard
          title="Pending Bills"
          value={String(pendingInvoicesCount)}
          icon={CreditCard}
          note="Need payment attention"
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Active service */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">Active service</CardTitle>
                <CardDescription>
                  Your current booking and technician status at a glance.
                </CardDescription>
              </div>
              {activeJob ? getStatusBadge(activeJob.status) : null}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {!activeJob ? (
              <EmptyState
                icon={Home}
                title="No active service right now"
                description="Book a service to see your live job tracker here."
                action={
                  <Button asChild className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90">
                    <Link href="/customer/book-service">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Book service
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-border bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {currentService}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {currentCustomerName}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(currentStatus)}
                        {getPaymentBadge(currentPayment)}
                        <Badge className="rounded-full border-border bg-background text-muted-foreground hover:bg-background">
                          Scheduled: {formatDate(activeJob.scheduledAt || activeJob.bookingId?.scheduledAt)}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-background p-4">
                      <p className="text-xs text-muted-foreground">Technician</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{currentTechName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{currentTechPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-5">
                  <ProgressPill label="Assigned" done={progress >= 1} />
                  <ProgressPill label="En route" done={progress >= 2} />
                  <ProgressPill label="Arrived" done={progress >= 3} />
                  <ProgressPill label="Started" done={progress >= 4} />
                  <ProgressPill label="Completed" done={progress >= 5} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Service"
                    value={currentService}
                    icon={BadgeCheck}
                    note={formatDateOnly(activeJob.scheduledAt || activeJob.bookingId?.scheduledAt)}
                  />
                  <StatCard
                    title="Technician"
                    value={currentTechName}
                    icon={PhoneCall}
                    note={currentTechPhone}
                  />
                  <StatCard
                    title="Payment"
                    value={activeJob?.bookingId?.estimatedPrice != null ? `₹${activeJob.bookingId.estimatedPrice}` : "-"}
                    icon={Wallet}
                    note={currentPayment}
                  />
                  <StatCard
                    title="Location"
                    value={currentCity}
                    icon={MapPin}
                    note={currentPincode}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <SectionTitle
                      title="Service details"
                      description="Address and booking details for the current service."
                    />
                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-muted/20 p-4">
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{currentAddress}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <p className="text-xs text-muted-foreground">City</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{currentCity}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <p className="text-xs text-muted-foreground">Pincode</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{currentPincode}</p>
                        </div>
                      </div>

                      <Button asChild variant="outline" className="w-full rounded-2xl">
                        <Link href="/customer/jobs">
                          Open job details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <SectionTitle
                      title="Quick actions"
                      description="Shortcuts to the most common tasks."
                    />
                    <Separator className="my-4" />

                    <div className="grid gap-3">
                      <QuickAction
                        href="/customer/book-service"
                        title="Book service"
                        description="Create a new service request."
                        icon={PlusCircle}
                      />
                      <QuickAction
                        href="/customer/requests"
                        title="My requests"
                        description="Review service requests and their status."
                        icon={ClipboardList}
                      />
                      <QuickAction
                        href="/customer/jobs"
                        title="My jobs"
                        description="Track active and completed jobs."
                        icon={Wrench}
                      />
                      <QuickAction
                        href="/customer/invoices"
                        title="My invoices"
                        description="View pending and paid bills."
                        icon={CreditCard}
                      />
                      <QuickAction
                        href="/customer/support"
                        title="Support"
                        description="Get help from the support team."
                        icon={Headphones}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-semibold">Search & actions</CardTitle>
                  <CardDescription>
                    Search requests and jobs quickly.
                  </CardDescription>
                </div>
                <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                  Customer
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requests or jobs..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="h-11 rounded-2xl">
                  <Link href="/customer/book-service">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Book
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-11 rounded-2xl">
                  <Link href="/customer/support">
                    <Headphones className="mr-2 h-4 w-4" />
                    Support
                  </Link>
                </Button>
              </div>

              <div className="rounded-3xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Account overview</p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">Total requests</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{totalRequests}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{completedJobsCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/70">
              <CardTitle className="text-xl font-semibold">Recent service requests</CardTitle>
              <CardDescription>
                Latest requests you have created.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-6">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredRequests.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No requests yet"
                  description="Start by booking your first service request."
                  action={
                    <Button asChild className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90">
                      <Link href="/customer/book-service">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Book service
                      </Link>
                    </Button>
                  }
                />
              ) : (
                filteredRequests.slice(0, 5).map((req: any) => (
                  <div
                    key={req._id}
                    className="rounded-3xl border border-border bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-foreground">
                            {req.serviceRequested || "Service request"}
                          </p>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {req.remarks || "No note added"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(req.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" />
                        Request
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Job history */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Service history</CardTitle>
              <CardDescription>
                Your latest completed services and records.
              </CardDescription>
            </div>
            <Badge className="rounded-full border-border bg-muted text-muted-foreground">
              {serviceHistory.length} recent
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {serviceHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title="No completed services yet"
              description="Completed jobs will appear here once the technician finishes them."
            />
          ) : (
            <div className="space-y-3">
              {serviceHistory.map((job: any) => (
                <button
                  key={job._id}
                  onClick={() => setSelectedJobId(job._id)}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    selectedJobId === job._id
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-border bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {job.bookingId?.serviceType || "Service"}
                      </div>
                      <div
                        className={`mt-1 text-sm ${
                          selectedJobId === job._id ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"
                        }`}
                      >
                        {job.bookingId?.customerId?.name || "Customer"} • {formatDateOnly(job.updatedAt || job.createdAt)}
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  <div
                    className={`mt-4 flex flex-wrap items-center gap-2 ${
                      selectedJobId === job._id ? "text-white/70 dark:text-slate-600" : ""
                    }`}
                  >
                    {getPaymentBadge(job.paymentStatus)}
                    <Badge className={`rounded-full ${
                      selectedJobId === job._id
                        ? "border-white/10 bg-white/10 text-white dark:border-slate-300 dark:bg-slate-100 dark:text-slate-700"
                        : "border-border bg-muted text-muted-foreground"
                    }`}>
                      Technician: {getTechnicianName(job)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent jobs */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Recent jobs</CardTitle>
              <CardDescription>
                Track active and completed jobs in one place.
              </CardDescription>
            </div>
            <Badge className="rounded-full border-border bg-muted text-muted-foreground">
              {filteredJobs.length} total
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : filteredJobs.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No jobs assigned yet"
              description="Jobs created by the admin will appear here."
            />
          ) : (
            <div className="space-y-3">
              {filteredJobs.slice(0, 6).map((job: any) => {
                const active = selectedJobId === job._id;

                return (
                  <button
                    key={job._id}
                    onClick={() => setSelectedJobId(job._id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-border bg-background hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold">
                            {job.bookingId?.serviceType || "Service job"}
                          </div>
                          {getStatusBadge(job.status)}
                        </div>
                        <div
                          className={`mt-1 text-sm ${
                            active ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"
                          }`}
                        >
                          Technician: {getTechnicianName(job)}
                        </div>
                      </div>

                      {getPaymentBadge(job.paymentStatus)}
                    </div>

                    <div
                      className={`mt-4 grid gap-2 text-xs sm:grid-cols-2 ${
                        active ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"
                      }`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.bookingId?.address?.city || job.bookingId?.address?.addressLine || "No address"}
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(job.scheduledAt || job.bookingId?.scheduledAt)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat panel */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="text-xl font-semibold">Support chat</CardTitle>
          <CardDescription>
            Open the conversation connected to your active job.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {activeJob ? (
            <JobChatPanel
              jobId={activeJob._id}
              currentUserId={session.user.id}
              currentUserRole={session.user.role}
              currentUserName={session.user.name}
              triggerLabel="Open chat"
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No active chat available"
              description="Once you have an active job, the chat panel will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}