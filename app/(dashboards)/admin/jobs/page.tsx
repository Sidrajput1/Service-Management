"use client";
import { useAssignJob, useJobs } from "@/hooks/useJobs";
import { useTechnicians } from "@/hooks/useLead";
import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  Filter,
  Home,
  Inbox,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  Truck,
  User2,
  Users2,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader,DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


function getStatusBadge(status?: string) {
  const s = (status || "new").toLowerCase();

  if (s.includes("complete") || s.includes("closed")) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Completed
      </Badge>
    );
  }
  if (s.includes("progress") || s.includes("arrive") || s.includes("started")) {
    return (
      <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
        In Progress
      </Badge>
    );
  }
  if (s.includes("assigned")) {
    return (
      <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
        Assigned
      </Badge>
    );
  }
  if (s.includes("pending")) {
    return (
      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
        Pending
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
      New
    </Badge>
  );
}

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
// Similar to formatDate but only returns date without time, e.g. "Jun 1, 2024"

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

// Utility to get initials from a name, e.g. "John Doe" => "JD"

function getInitials(name?: string) {
  if (!name) return "J";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Utility to get a label for the customer, e.g. name or phone or "Customer"
function getBookingCustomerLabel(job: any) {
  const customer = job?.bookingId?.customerId;
  if (!customer) return "Customer";
  if (typeof customer === "string") return "Customer";
  return customer.name || customer.phone || "Customer";
}

// Utility to get phone number for the customer or "-" if not available

function getBookingCustomerPhone(job: any) {
  const customer = job?.bookingId?.customerId;
  if (!customer || typeof customer === "string") return "-";
  return customer.phone || "-";
}

function getTechnicianName(tech: any) {
  if (!tech) return "Technician";
  if (tech.userId && typeof tech.userId === "object") {
    return tech.userId.name || tech.userId.email || "Technician";
  }
  return tech.name || tech.userId || "Technician";
}

function getTechnicianEmail(tech: any) {
  if (!tech) return "-";
  if (tech.userId && typeof tech.userId === "object") {
    return tech.userId.email || "-";
  }
  return "-";
}

function getTechnicianIdValue(job: any) {
  if (!job?.technicianId) return "";
  if (typeof job.technicianId === "string") return job.technicianId;
  return job.technicianId._id || "";
}

function getJobStatusBadge(status?: string) {
  const value = (status || "assigned").toLowerCase();

  if (value.includes("complete") || value.includes("done")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Completed
      </Badge>
    );
  }

  if (
    value.includes("progress") ||
    value.includes("work") ||
    value.includes("ongoing")
  ) {
    return (
      <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400">
        In Progress
      </Badge>
    );
  }

  if (value.includes("accept")) {
    return (
      <Badge className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/10 dark:text-violet-400">
        Accepted
      </Badge>
    );
  }

  if (value.includes("cancel") || value.includes("reject")) {
    return (
      <Badge className="rounded-full border-rose-500/20 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400">
        Cancelled
      </Badge>
    );
  }

  if (value.includes("assigned")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        Assigned
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
      {status || "Unknown"}
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

function getTechnicianStatusBadge(status?: string) {
  const value = (status || "inactive").toLowerCase();

  if (value.includes("busy")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        Busy
      </Badge>
    );
  }

  if (value.includes("active") || value.includes("online")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Active
      </Badge>
    );
  }

  if (value.includes("inactive") || value.includes("offline")) {
    return (
      <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
        Inactive
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-slate-500/20 bg-slate-500/10 text-slate-700 hover:bg-slate-500/10 dark:text-slate-400">
      {status || "Unknown"}
    </Badge>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-80 items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

function JobsTableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-6 gap-3 rounded-2xl border border-border bg-card px-4 py-4"
        >
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function AdminJobsPage() {
  const [page, setPage] = useState(1);
  const [selectedTechnicians, setSelectedTechnicians] = useState<
    Record<string, string>
  >({});
  const [search, setSearch] = useState("");

  const [selectedStatus,setSelectedStatus] = useState("all");
  const [selectedPayment,setSelectedPayment] = useState("all");
  const [selectedAssignment , setSelectedAssignment] = useState("all");
  const [selectedJob,setSelectedJob] = useState<any | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<any | null>(null);

  // Fetch jobs with pagination and filters (status, payment, assignment)
  const { data: jobsData, isLoading, refetch } = useJobs(page, 20);
  const { data: techniciansData } = useTechnicians(1, 100);

  const assignJob = useAssignJob();

  const jobs = jobsData?.jobs || [];

  // Get the list of technicians
  const technicians = techniciansData?.technicians || [];
  
// Filter jobs based on search query (service type, customer name, technician name)
  // const filteredJobs = useMemo(() => {
  //   const q = search.trim().toLowerCase();
  //   if (!q) return jobs;

  //   return jobs.filter((job: any) => {
  //     const service = job.bookingId?.serviceType || "";
  //     const customer = job.bookingId?.customerId?.name || "";
  //     const technician =
  //       job.technicianId?.userId?.name || job.technicianId?.userId?.email || "";
  //     return `${service} ${customer} ${technician}`.toLowerCase().includes(q);
  //   });
  // }, [jobs, search]);

  const filteredJobs = useMemo(() => {
      const q = search.trim().toLowerCase();

      // If no search query, return all jobs
      
      // Apply filters based on status, payment, and assignment
      return jobs.filter((job:any) => {
        const service = job.bookingId?.serviceType || "";
        const customer = getBookingCustomerLabel(job);
        const technicianName = getTechnicianName(job.technicianId);
        const payment = job.paymentStatus || "";
        const status = job.status || "";
        const assigned = !!job.technicianId;


        // Create a haystack string that includes all relevant fields for searching
        const haystack = `${service} ${customer} ${technicianName} ${payment} ${status}`.toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus =
        selectedStatus === "all"
          ? true
          : (job.status || "").toLowerCase() === selectedStatus;
      const matchesPayment =
        selectedPayment === "all"
          ? true
          : (job.paymentStatus || "").toLowerCase() === selectedPayment;
      const matchesAssignment =
        selectedAssignment === "all"
          ? true
          : selectedAssignment === "assigned"
            ? assigned
            : !assigned;

      return matchesQuery && matchesStatus && matchesPayment && matchesAssignment;

      });
  },[jobs,search,selectedStatus,selectedPayment,selectedAssignment]);

  // Compute summary statistics for the dashboard
  const stats = useMemo(() => {
    const total = jobs.length;
    const assigned = jobs.filter((j: any) => j.technicianId).length;
    const unassigned = total - assigned;
    const completed = jobs.filter((j: any) =>
      (j.status || "").toLowerCase().includes("complete"),
    ).length;

    const inProgress = jobs.filter((j:any) => {
      const value = (j.status || "").toLowerCase();
      return value.includes("assigned") ||value.includes("progress") || value.includes("accept") || value.includes("ongoing");
    }).length;

    return { total, assigned, unassigned, completed, inProgress };
  }, [jobs]);

  async function handleAssign(jobId: string) {
    const technicianId = selectedTechnicians[jobId];
    if (!technicianId) {
      toast.error("Please select a technician first");
      return;
    }
    // await assignJob.mutateAsync({ id: jobId, technicianId });
    try {
      await assignJob.mutateAsync({ id: jobId, technicianId });
      toast.success("Job assigned successfully");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign job");
    }
  };

  async function copyOtp(job: any) {
    try {
      if (!job?.otp) {
        toast.error("OTP not available");
        return;
      }
      await navigator.clipboard.writeText(String(job.otp));
      toast.success("OTP copied");
    } catch {
      toast.error("Could not copy OTP");
    }
  }

  const openedJobTechnician = selectedJob?.technicianId || null;
  const selectedJobTechnicianId = getTechnicianIdValue(selectedJob);
  const isAssigned = Boolean(selectedJobTechnicianId);
  return (

     <div className="space-y-8 bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Job dispatch workspace
          </div>
          <div>
            <h1 className="font-poppins text-3xl font-semibold tracking-tight">
              Jobs
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Monitor all active jobs, inspect full job details, review technician data, and assign or reassign field staff from one place.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Current jobs</p>
            <p className="mt-1 text-lg font-semibold">{stats.total}</p>
          </div>
          <Button variant="outline" onClick={() => refetch?.()} className="h-11 rounded-2xl">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Total jobs</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Live
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.total}</p>
              <p className="mt-1 text-sm text-muted-foreground">All job records loaded for the current page.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Assigned</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.assigned}</p>
              <p className="mt-1 text-sm text-muted-foreground">Jobs already mapped to technicians.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Unassigned</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.unassigned}</p>
              <p className="mt-1 text-sm text-muted-foreground">Jobs waiting for technician allocation.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.completed}</p>
              <p className="mt-1 text-sm text-muted-foreground">Jobs marked as done or closed.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <Home className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">In progress</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.inProgress}</p>
              <p className="mt-1 text-sm text-muted-foreground">Assigned or actively being worked on.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Jobs list</CardTitle>
              <CardDescription>
                Search, filter, inspect, and assign work from a single operational view.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative w-full xl:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search service, customer, technician..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>

            <Select value={selectedStatus} onValueChange={() => setSelectedStatus}>
                <SelectTrigger className="h-11 w-full rounded-2xl xl:w-44">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in-progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPayment} onValueChange={() => setSelectedPayment}>
                <SelectTrigger className="h-11 w-full rounded-2xl xl:w-44">
                  <Ticket className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  <SelectItem value="unbilled">Unbilled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="billed">Billed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedAssignment} onValueChange={() => setSelectedAssignment}>
                <SelectTrigger className="h-11 w-full rounded-2xl xl:w-44">
                  <Users2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              All
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              Dispatch
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              Technician
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              OTP
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <JobsTableSkeleton />
          ) : filteredJobs.length === 0 ? (
            <EmptyState
              title="No jobs found"
              description="Try a different search or adjust the filters to narrow the list."
              action={
                <Button
                  className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  onClick={() => {
                    setSearch("");
                    setSelectedStatus("all");
                    setSelectedPayment("all");
                    setSelectedAssignment("all");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-muted-foreground">Job</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Customer</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Technician</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Payment</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredJobs.map((job: any) => {
                      const currentTechId =
                        selectedTechnicians[job._id] || getTechnicianIdValue(job) || "";

                      const isAssigned = !!job.technicianId;
                      const jobService = job.bookingId?.serviceType || "Service";
                      const technician = job.technicianId || null;

                      return (
                        <TableRow key={job._id} className="group hover:bg-muted/30">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-muted/50">
                                  <ClipboardList className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {jobService}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Job ID: {job._id.slice(-6).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Scheduled: {formatDate(job.scheduledAt || job.bookingId?.scheduledAt)}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border">
                                <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                                  {getInitials(getBookingCustomerLabel(job))}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {getBookingCustomerLabel(job)}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {getBookingCustomerPhone(job)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {technician ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 border border-border">
                                    <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                                      {getInitials(getTechnicianName(technician))}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                      {getTechnicianName(technician)}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {getTechnicianEmail(technician)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getTechnicianStatusBadge(technician.status)}
                                  <span className="text-xs text-muted-foreground">
                                    {technician.jobsCompleted ?? 0} jobs completed
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <Badge className="rounded-full border-slate-500/20 bg-slate-500/10 text-slate-700 hover:bg-slate-500/10 dark:text-slate-400">
                                Unassigned
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>{getJobStatusBadge(job.status)}</TableCell>

                          <TableCell>{getPaymentBadge(job.paymentStatus)}</TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-xl">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-2xl">
                                  <DropdownMenuItem
                                    onClick={() => setSelectedJob(job)}
                                    className="rounded-xl"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View job details
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => setSelectedTechnician(technician)}
                                    className="rounded-xl"
                                    disabled={!technician}
                                  >
                                    <User2 className="mr-2 h-4 w-4" />
                                    View technician
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => copyOtp(job)}
                                    className="rounded-xl"
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy OTP
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedJob(job);
                                      toast.info("Open the job details panel to reassign the technician");
                                    }}
                                    className="rounded-xl"
                                  >
                                    <Truck className="mr-2 h-4 w-4" />
                                    Reassign in details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedJob(job);
                                  if (technician) setSelectedTechnician(technician);
                                }}
                                variant="outline"
                                className="h-10 rounded-xl"
                              >
                                Open
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Page <span className="font-medium text-foreground">{page}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-2xl"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-2xl"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Job details drawer */}
      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="space-y-2">
            <SheetTitle className="text-xl font-semibold">Job details</SheetTitle>
            <SheetDescription>
              Review the full job record, technician assignment, OTP, proofs, and booking context.
            </SheetDescription>
          </SheetHeader>

          {selectedJob ? (
            <div className="mt-6 space-y-6">
              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Job reference</p>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {selectedJob.bookingId?.serviceType || "Service"}
                        </h3>
                        {getJobStatusBadge(selectedJob.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Job ID: {selectedJob._id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => copyOtp(selectedJob)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy OTP
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Customer & booking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarFallback className="bg-background text-sm font-semibold">
                            {getInitials(getBookingCustomerLabel(selectedJob))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getBookingCustomerLabel(selectedJob)}</p>
                          <p className="text-sm text-muted-foreground">
                            {getBookingCustomerPhone(selectedJob)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">{selectedJob.bookingId?.serviceType || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Schedule</span>
                        <span className="font-medium">
                          {formatDate(selectedJob.scheduledAt || selectedJob.bookingId?.scheduledAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Estimated price</span>
                        <span className="font-medium">
                          {selectedJob.bookingId?.estimatedPrice != null
                            ? `₹${selectedJob.bookingId.estimatedPrice}`
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Address
                      </p>
                      <div className="rounded-2xl border border-border bg-background p-4 text-sm text-foreground">
                        <p>{selectedJob.bookingId?.address?.addressLine || "-"}</p>
                        <p className="mt-1 text-muted-foreground">
                          {selectedJob.bookingId?.address?.city || "-"}
                          {selectedJob.bookingId?.address?.pincode
                            ? ` • ${selectedJob.bookingId.address.pincode}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Technician</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {openedJobTechnician ? (
                      <>
                        <div className="rounded-2xl border border-border bg-muted/30 p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarFallback className="bg-background text-sm font-semibold">
                                {getInitials(getTechnicianName(openedJobTechnician))}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {getTechnicianName(openedJobTechnician)}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {getTechnicianEmail(openedJobTechnician)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {getTechnicianStatusBadge(openedJobTechnician.status)}
                          <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                            Vehicle: {openedJobTechnician.vehicleType || "-"}
                          </Badge>
                          <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                            Rating: {openedJobTechnician.rating ?? 0}
                          </Badge>
                        </div>

                        <div className="grid gap-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Jobs completed</span>
                            <span className="font-medium">{openedJobTechnician.jobsCompleted ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Active</span>
                            <span className="font-medium">
                              {openedJobTechnician.isActive ? "Yes" : "No"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Skills</span>
                            <span className="font-medium">
                              {(openedJobTechnician.skills || []).length
                                ? openedJobTechnician.skills.join(", ")
                                : "-"}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full rounded-2xl"
                          onClick={() => setSelectedTechnician(openedJobTechnician)}
                        >
                          View full technician details
                        </Button>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                        This job is currently unassigned.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Operational data</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">OTP</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-2xl font-semibold tracking-widest">
                        {selectedJob.otp || "-"}
                      </p>
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => copyOtp(selectedJob)}>
                        Copy
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Expires: {formatDate(selectedJob.otpExpiresAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment</p>
                    <div className="mt-2">
                      {getPaymentBadge(selectedJob.paymentStatus)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Payment state is tied to this job record.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Proofs</p>
                    <p className="mt-2 text-sm font-medium">
                      {selectedJob.proofIds?.length ? `${selectedJob.proofIds.length} item(s)` : "No proof uploaded"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Proof required: {selectedJob.proofRequired ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
                    <p className="mt-2 text-sm font-medium">
                      Created: {formatDate(selectedJob.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Accepted: {formatDate(selectedJob.acceptedAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Reassign technician</CardTitle>
                  <CardDescription>
                    Assign a new technician without leaving the details panel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Technician</Label>
                    <Select
                      value={selectedTechnicians[selectedJob._id] || selectedJobTechnicianId || ""}
                      onValueChange={(value) =>
                        setSelectedTechnicians((prev) => ({
                          ...prev,
                          [selectedJob._id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((tech: any) => (
                          <SelectItem key={tech._id} value={tech._id}>
                            {getTechnicianName(tech)} — {tech.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setSelectedJob(null)}
                    >
                      Close
                    </Button>
                    <Button
                      className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                      onClick={() => handleAssign(selectedJob._id)}
                      disabled={assignJob.isPending}
                    >
                      {assignJob.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : isAssigned ? (
                        "Reassign"
                      ) : (
                        "Assign"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">
                    {selectedJob.notes || "No notes available."}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Technician details modal */}
      <Dialog
        open={!!selectedTechnician}
        onOpenChange={(open) => !open && setSelectedTechnician(null)}
      >
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Technician details</DialogTitle>
            <DialogDescription>
              Review technician profile, status, performance, and skill set.
            </DialogDescription>
          </DialogHeader>

          {selectedTechnician ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-border">
                    <AvatarFallback className="bg-background text-base font-semibold">
                      {getInitials(getTechnicianName(selectedTechnician))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {getTechnicianName(selectedTechnician)}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {getTechnicianEmail(selectedTechnician)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getTechnicianStatusBadge(selectedTechnician.status)}
                      <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                        Vehicle: {selectedTechnician.vehicleType || "-"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Performance</p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rating</span>
                      <span className="font-medium">{selectedTechnician.rating ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Jobs completed</span>
                      <span className="font-medium">{selectedTechnician.jobsCompleted ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active</span>
                      <span className="font-medium">
                        {selectedTechnician.isActive ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selectedTechnician.skills || []).length ? (
                      selectedTechnician.skills.map((skill: string) => (
                        <Badge
                          key={skill}
                          className="rounded-full border-border bg-muted text-muted-foreground"
                        >
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No skills listed</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                  <p className="mt-2 text-sm text-foreground">
                    Current:{" "}
                    {selectedTechnician.currentLocation?.coordinates
                      ? selectedTechnician.currentLocation.coordinates.join(", ")
                      : "-"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last completed:{" "}
                    {selectedTechnician.lastCompletedWorkLocation?.coordinates
                      ? selectedTechnician.lastCompletedWorkLocation.coordinates.join(", ")
                      : "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Record</p>
                  <p className="mt-2 text-sm text-foreground">
                    Technician ID: {selectedTechnician._id}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Created: {formatDate(selectedTechnician.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Updated: {formatDate(selectedTechnician.updatedAt)}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => setSelectedTechnician(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
   
    // <div className="space-y-6">
    //   {/* Summary cards */}
    //   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
    //           <ClipboardList className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">Total Jobs</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.total}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
    //           <Wrench className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">Assigned</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.assigned}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
    //           <AlertCircle className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">Unassigned</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.unassigned}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
    //           <Users2 className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">Completed</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.completed}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>
    //   </div>

    //   {/* Main card */}
    //   <Card className="border-slate-200 shadow-sm">
    //     <CardHeader className="border-b border-slate-100">
    //       <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    //         <div>
    //           <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
    //             Jobs
    //           </CardTitle>
    //           <p className="mt-1 text-sm text-slate-500">
    //             Assign or reassign technicians and monitor job progress
    //           </p>
    //         </div>

    //         <div className="flex flex-col gap-3 sm:flex-row">
    //           <div className="relative w-full sm:w-80">
    //             <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    //             <Input
    //               value={search}
    //               onChange={(e) => setSearch(e.target.value)}
    //               placeholder="Search service, customer, technician..."
    //               className="h-11 rounded-xl pl-10"
    //             />
    //           </div>

    //           <Button
    //             variant="outline"
    //             className="h-11 rounded-xl"
    //             onClick={() => refetch?.()}
    //           >
    //             <RefreshCw className="mr-2 h-4 w-4" />
    //             Refresh
    //           </Button>
    //         </div>
    //       </div>
    //     </CardHeader>

    //     <CardContent className="p-0">
    //       <div className="overflow-x-auto">
    //         <Table>
    //           <TableHeader className="bg-slate-50">
    //             <TableRow>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Booking
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Technician
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Status
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 OTP Expiry
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Assign / Reassign
    //               </TableHead>
    //             </TableRow>
    //           </TableHeader>

    //           <TableBody>
    //             {isLoading ? (
    //               <TableRow>
    //                 <TableCell
    //                   colSpan={5}
    //                   className="py-10 text-center text-slate-500"
    //                 >
    //                   Loading jobs...
    //                 </TableCell>
    //               </TableRow>
    //             ) : filteredJobs.length === 0 ? (
    //               <TableRow>
    //                 <TableCell colSpan={5} className="py-14 text-center">
    //                   <div className="mx-auto max-w-sm">
    //                     <p className="text-base font-medium text-slate-900">
    //                       No jobs found
    //                     </p>
    //                     <p className="mt-1 text-sm text-slate-500">
    //                       Try a different search query.
    //                     </p>
    //                   </div>
    //                 </TableCell>
    //               </TableRow>
    //             ) : (
    //               filteredJobs.map((job: any) => {
    //                 const currentTechId =
    //                   selectedTechnicians[job._id] ||
    //                   job.technicianId?._id ||
    //                   "";

    //                 return (
    //                   <TableRow key={job._id} className="hover:bg-slate-50/70">
    //                     <TableCell>
    //                       <div className="font-medium text-slate-900">
    //                         {job.bookingId?.serviceType || "Service"}
    //                       </div>
    //                       <div className="text-xs text-slate-500">
    //                         {job.bookingId?.customerId?.name || "Customer"}
    //                       </div>
    //                       {job.bookingId?.scheduledAt && (
    //                         <div className="mt-1 text-xs text-slate-500">
    //                           Scheduled: {formatDate(job.bookingId.scheduledAt)}
    //                         </div>
    //                       )}
    //                     </TableCell>

    //                     <TableCell>
    //                       {job.technicianId ? (
    //                         <div className="space-y-1">
    //                           <div className="font-medium text-slate-900">
    //                             {job.technicianId?.userId?.name ||
    //                               job.technicianId?.userId?.email ||
    //                               "Technician"}
    //                           </div>
    //                           <div className="text-xs text-slate-500">
    //                             {job.technicianId?.status || "-"}
    //                           </div>
    //                         </div>
    //                       ) : (
    //                         <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
    //                           Unassigned
    //                         </Badge>
    //                       )}
    //                     </TableCell>

    //                     <TableCell>{getStatusBadge(job.status)}</TableCell>

    //                     <TableCell className="text-slate-600">
    //                       {job.otpExpiresAt
    //                         ? formatDate(job.otpExpiresAt)
    //                         : "-"}
    //                     </TableCell>

    //                     <TableCell>
    //                       <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
    //                         <Select
    //                           value={currentTechId}
    //                           onValueChange={(value) =>
    //                             setSelectedTechnicians((prev) => ({
    //                               ...prev,
    //                               [job._id]: value,
    //                             }))
    //                           }
    //                         >
    //                           <SelectTrigger className="h-11 w-full rounded-xl lg:w-60">
    //                             <SelectValue placeholder="Select technician" />
    //                           </SelectTrigger>
    //                           <SelectContent>
    //                             {(techniciansData?.technicians || []).map(
    //                               (tech: any) => (
    //                                 <SelectItem key={tech._id} value={tech._id}>
    //                                   {tech.userId?.name ||
    //                                     tech.userId?.email ||
    //                                     "Technician"}{" "}
    //                                   — {tech.status}
    //                                 </SelectItem>
    //                               ),
    //                             )}
    //                           </SelectContent>
    //                         </Select>

    //                         <Button
    //                           size="sm"
    //                           onClick={() => handleAssign(job._id)}
    //                           disabled={assignJob.isPending}
    //                           className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
    //                         >
    //                           {assignJob.isPending ? (
    //                             <>
    //                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    //                               Saving...
    //                             </>
    //                           ) : job.technicianId ? (
    //                             "Reassign"
    //                           ) : (
    //                             "Assign"
    //                           )}
    //                         </Button>
    //                       </div>
    //                     </TableCell>
    //                   </TableRow>
    //                 );
    //               })
    //             )}
    //           </TableBody>
    //         </Table>
    //       </div>

    //       <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
    //         <div className="text-sm text-slate-500">
    //           Page <span className="font-medium text-slate-900">{page}</span>
    //         </div>

    //         <div className="flex gap-2">
    //           <Button
    //             variant="outline"
    //             disabled={page <= 1}
    //             onClick={() => setPage((p) => Math.max(1, p - 1))}
    //             className="rounded-xl"
    //           >
    //             Prev
    //           </Button>
    //           <Button
    //             variant="outline"
    //             onClick={() => setPage((p) => p + 1)}
    //             className="rounded-xl"
    //           >
    //             Next
    //           </Button>
    //         </div>
    //       </div>
    //     </CardContent>
    //   </Card>
    // </div>
  );
}

export default AdminJobsPage;
