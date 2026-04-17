"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  AlertTriangle,
  FileImage,
  ClipboardList,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTechnicianJobs } from "@/hooks/useTechnicianJobs";

function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();

  if (["completed", "done", "closed"].includes(s)) {
    return <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Completed</Badge>;
  }
  if (["accepted", "arrived", "in_progress", "on_hold"].includes(s)) {
    return <Badge className="rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-50">Active</Badge>;
  }
  if (["assigned", "scheduled"].includes(s)) {
    return <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">Assigned</Badge>;
  }
  if (s.includes("cancel")) {
    return <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">Cancelled</Badge>;
  }
  return <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">{status || "New"}</Badge>;
}

function paymentBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Paid</Badge>;
  if (s === "unbilled") return <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">Unbilled</Badge>;
  if (s === "partial") return <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">Partial</Badge>;
  if (s === "due") return <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">Due</Badge>;
  return <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">{status || "Unknown"}</Badge>;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function formatCountdown(expiresAt?: string | Date | null) {
  if (!expiresAt) return "-";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(diff)) return "-";
  if (diff <= 0) return "Expired";

  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0) return `${hrs}h ${remMins}m left`;
  return `${mins}m left`;
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-white/15 p-2">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-xl font-semibold leading-none text-white">{value}</div>
          <div className="text-xs text-white/70">{label}</div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default function TechnicianJobsPage() {
  const router = useRouter();
  const { data, isLoading } = useTechnicianJobs();
  const jobs = data?.jobs || [];

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "assigned" | "active" | "completed" | "unbilled">("all");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  React.useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0]._id);
    }
  }, [jobs, selectedJobId]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();

    return jobs.filter((job: any) => {
      const customer = job.bookingId?.customerId?.name || "";
      const phone = job.bookingId?.customerId?.phone || "";
      const service = job.bookingId?.serviceType || "";
      const address = job.bookingId?.address?.city || job.bookingId?.address?.addressLine || "";
      const status = (job.status || "").toLowerCase();
      const payment = (job.paymentStatus || "").toLowerCase();

      const matchesQuery =
        !q ||
        `${customer} ${phone} ${service} ${address} ${status} ${payment}`.toLowerCase().includes(q);

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "assigned"
            ? ["assigned", "scheduled"].includes(status)
            : filter === "active"
              ? ["accepted", "arrived", "in_progress", "on_hold"].includes(status)
              : filter === "completed"
                ? status === "completed"
                : filter === "unbilled"
                  ? payment === "unbilled"
                  : true;

      return matchesQuery && matchesFilter;
    });
  }, [jobs, query, filter]);

  const selectedJob = useMemo(
    () => filteredJobs.find((job: any) => job._id === selectedJobId) || null,
    [filteredJobs, selectedJobId]
  );

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      assigned: jobs.filter((j: any) => ["assigned", "scheduled"].includes(j.status)).length,
      active: jobs.filter((j: any) => ["accepted", "arrived", "in_progress", "on_hold"].includes(j.status)).length,
      completed: jobs.filter((j: any) => j.status === "completed").length,
    };
  }, [jobs]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-emerald-50/40 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <Card className="overflow-hidden border-0 shadow-xl shadow-emerald-500/10">
          <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-500 px-6 py-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
                  <Wrench className="h-3.5 w-3.5" />
                  Technician job list
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Manage your jobs with clarity
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  View recent assignments, check customer details, review address and payment status, and continue the service workflow.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Total" value={String(stats.total)} icon={ClipboardList} />
                <MiniStat label="Assigned" value={String(stats.assigned)} icon={CalendarDays} />
                <MiniStat label="Active" value={String(stats.active)} icon={CircleDot} />
                <MiniStat label="Completed" value={String(stats.completed)} icon={CheckCircle2} />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          {/* Left: list */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-emerald-50/40">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                      Jobs
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      Click a job to open details and continue work
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    onClick={() => router.push("/technician/dashboard")}
                  >
                    Back to dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search customer, phone, service, city..."
                      className="h-11 rounded-2xl border-slate-200 bg-white pl-10 shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
                    {[
                      ["all", "All"],
                      ["assigned", "Assigned"],
                      ["active", "Active"],
                      ["completed", "Completed"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setFilter(key as any)}
                        className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                          filter === key
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Loading jobs...
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  No jobs found.
                </div>
              ) : (
                <ScrollArea className="h-[72vh] pr-2">
                  <div className="space-y-3">
                    {filteredJobs.map((job: any) => {
                      const customer = job.bookingId?.customerId;
                      const active = selectedJobId === job._id;
                      const payment = job.paymentStatus || "unbilled";

                      return (
                        <button
                          key={job._id}
                          onClick={() => {
                            setSelectedJobId(job._id);
                            router.push(`/technician/jobs?jobId=${job._id}`);
                          }}
                          className={`w-full rounded-3xl border p-4 text-left transition ${
                            active
                              ? "border-emerald-300 bg-emerald-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-semibold text-slate-900">
                                {job.bookingId?.serviceType || "Service job"}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {customer?.name || "Customer"} • {customer?.phone || "-"}
                              </div>
                            </div>
                            {statusBadge(job.status)}
                          </div>

                          <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                            <div className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.bookingId?.address?.city || job.bookingId?.address?.addressLine || "No address"}
                            </div>
                            <div className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(job.scheduledAt)}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {paymentBadge(payment)}
                            {job.proofRequired ? (
                              <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
                                Proof required
                              </Badge>
                            ) : null}
                            {job.chatUnreadCount > 0 ? (
                              <Badge className="rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
                                {job.chatUnreadCount} unread message{job.chatUnreadCount > 1 ? "s" : ""}
                              </Badge>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Right: details */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-linear-to-r from-white to-emerald-50/40">
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Job details
              </CardTitle>
              <p className="text-sm text-slate-500">
                Customer, address, OTP, payment, proof, and chat info
              </p>
            </CardHeader>

            <CardContent className="p-4">
              {!selectedJob ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  Select a job from the list to view details.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">
                          {selectedJob.bookingId?.serviceType || "Service job"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {selectedJob.bookingId?.customerId?.name || "Customer"} • {selectedJob.bookingId?.customerId?.phone || "-"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {selectedJob.bookingId?.address?.addressLine || "Address not added"}
                        </div>
                      </div>
                      {statusBadge(selectedJob.status)}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {paymentBadge(selectedJob.paymentStatus)}
                      {selectedJob.proofRequired ? (
                        <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">Proof required</Badge>
                      ) : null}
                      <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                        OTP: {selectedJob.otp ? "Available" : "Missing"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow label="Scheduled at" value={formatDate(selectedJob.scheduledAt)} />
                    <DetailRow label="OTP expires" value={formatDate(selectedJob.otpExpiresAt)} />
                    <DetailRow label="OTP countdown" value={formatCountdown(selectedJob.otpExpiresAt)} />
                    <DetailRow label="Payment status" value={selectedJob.paymentStatus || "unbilled"} />
                    <DetailRow label="Proof files" value={String(selectedJob.proofIds?.length || 0)} />
                    <DetailRow label="Unread chat" value={String(selectedJob.chatUnreadCount || 0)} />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      Customer address
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <DetailRow
                        label="Address line"
                        value={selectedJob.bookingId?.address?.addressLine || selectedJob.bookingId?.customerId?.addresses?.[0]?.addressLine || "-"}
                      />
                      <DetailRow
                        label="City"
                        value={selectedJob.bookingId?.address?.city || selectedJob.bookingId?.customerId?.addresses?.[0]?.city || "-"}
                      />
                      <DetailRow
                        label="State"
                        value={selectedJob.bookingId?.address?.state || selectedJob.bookingId?.customerId?.addresses?.[0]?.state || "-"}
                      />
                      <DetailRow
                        label="Pincode"
                        value={selectedJob.bookingId?.address?.pincode || selectedJob.bookingId?.customerId?.addresses?.[0]?.pincode || "-"}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-medium text-slate-900">Quick actions</div>
                    <p className="mt-1 text-xs text-slate-500">
                      Use these shortcuts to continue the current job flow.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Button
                        className="h-11 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                        onClick={() => router.push(`/technician/jobs?jobId=${selectedJob._id}`)}
                      >
                        Open job workflow
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl border-slate-200 bg-white"
                        onClick={() => router.push(`/technician/jobs?jobId=${selectedJob._id}&tab=chat`)}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Open chat
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-linear-to-r from-emerald-50 to-cyan-50 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Notes</div>
                    <p className="mt-2">
                      {selectedJob.notes || "No notes available for this job."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
// ```

// Your sample job data is especially useful because it lets the list page show more than just the status: customer identity, service type, scheduled time, address, OTP expiry, payment state, proof requirement, unread chat count, and notes all fit naturally into the technician workflow. fileciteturn5file0turn5file0

// One small note: the page above assumes you have a route like `/technician/jobs?jobId=...` or `/technician/jobs/[id]` to open the workflow view. If your route is different, I can align the navigation to it in the next pass.
