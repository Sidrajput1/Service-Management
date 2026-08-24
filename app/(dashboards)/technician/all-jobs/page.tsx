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
  Activity,
  Receipt,
  Camera,
  Copy,
  FileText,
  RefreshCcw,
  Landmark,
  Ticket,
  MessageSquare,
  Navigation,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTechnicianJobs } from "@/hooks/useTechnicianJobs";
import { toast } from "sonner";

import { AvatarFallback , Avatar } from "@/components/ui/avatar";




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

function formatDateOnly(date?:string | Date | null){
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
};

function formatTime(date?:string | Date | null){
   if (!date) return "-";
  try {
    return new Date(date).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
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
};

function getInitials(name?: string) {
  if (!name) return "J";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

function statusBadge(status?: string) {
  const value = (status || "").toLowerCase();

  if (value.includes("completed") || value.includes("done")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Completed
      </Badge>
    );
  }

  if (value.includes("accepted")) {
    return (
      <Badge className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/10 dark:text-violet-400">
        Accepted
      </Badge>
    );
  }

  if (value.includes("arrived")) {
    return (
      <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400">
        Arrived
      </Badge>
    );
  }

  if (value.includes("in_progress") || value.includes("progress") || value.includes("ongoing")) {
    return (
      <Badge className="rounded-full border-cyan-500/20 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-400">
        In Progress
      </Badge>
    );
  }

  if (value.includes("on_hold")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        On Hold
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

  if (value.includes("assigned") || value.includes("scheduled")) {
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

function paymentBadge(status?: string) {
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

function proofBadge(count?: number) {
  if (!count) {
    return (
      <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
        No proof
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/10 dark:text-violet-400">
      {count} proof{count > 1 ? "s" : ""}
    </Badge>
  );
}


function MiniMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col items-start  justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground mr-7 ">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div className="flex h-10  w-10 items-center justify-center rounded-2xl border border-border bg-muted/40">
          {icon}
        </div>
      </div>
    </div>
  );
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
};

function TimelineItem({
  title,
  value,
  time,
  active,
}: {
  title: string;
  value?: string | null;
  time?: string | Date | null;
  active?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`mt-1 h-3.5 w-3.5 rounded-full border ${
          active
            ? "border-emerald-500 bg-emerald-500"
            : "border-border bg-muted"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{time ? formatDate(time) : "-"}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {value || "Not recorded yet"}
        </p>
      </div>
    </div>
  );
}


export default function TechnicianJobsPage() {
  const router = useRouter();
  const { data, isLoading,refetch } = useTechnicianJobs();
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

  React.useEffect(() => {
    if(!filteredJobs.length){
      setSelectedJobId("");
      return;
    };

     const existsInFiltered = filteredJobs.some((job: any) => job._id === selectedJobId);
    if (!selectedJobId || !existsInFiltered) {
      setSelectedJobId(filteredJobs[0]._id);
    }
  },[filteredJobs,selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job: any) => job._id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      assigned: jobs.filter((j: any) => ["assigned", "scheduled"].includes(j.status)).length,
      active: jobs.filter((j: any) => ["accepted", "arrived", "in_progress", "on_hold"].includes(j.status)).length,
      //completed: jobs.filter((j: any) => j.status === "completed").length,
        completed : jobs.filter((j: any) => (j.status || "").toLowerCase() === "completed").length,
     paid : jobs.filter((j: any) => (j.paymentStatus || "").toLowerCase() === "paid").length,
     withProof : jobs.filter((j: any) => (j.proofIds || []).length > 0).length,
    };
  }, [jobs]);

  async function copyText(value?: string | null, label = "Copied") {
    try {
      if (!value) {
        toast.error("Nothing to copy");
        return;
      }
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Could not copy");
    }
  }

  const customer = selectedJob?.bookingId?.customerId;
  const address = selectedJob?.bookingId?.address;
  const coords = address?.location?.coordinates || [];
  const mapUrl =
    coords.length === 2 ? `https://www.google.com/maps?q=${coords[1]},${coords[0]}` : null;


  return (
    // <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-emerald-50/40 p-4 sm:p-6">
    //   <div className="mx-auto max-w-7xl space-y-6">
    //     {/* Header */}
    //     <Card className="overflow-hidden border-0 shadow-xl shadow-emerald-500/10">
    //       <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-500 px-6 py-6 text-white">
    //         <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    //           <div>
    //             <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
    //               <Wrench className="h-3.5 w-3.5" />
    //               Technician job list
    //             </div>
    //             <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
    //               Manage your jobs with clarity
    //             </h1>
    //             <p className="mt-2 max-w-2xl text-sm text-white/80">
    //               View recent assignments, check customer details, review address and payment status, and continue the service workflow.
    //             </p>
    //           </div>

    //           <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    //             <MiniStat label="Total" value={String(stats.total)} icon={ClipboardList} />
    //             <MiniStat label="Assigned" value={String(stats.assigned)} icon={CalendarDays} />
    //             <MiniStat label="Active" value={String(stats.active)} icon={CircleDot} />
    //             <MiniStat label="Completed" value={String(stats.completed)} icon={CheckCircle2} />
    //           </div>
    //         </div>
    //       </div>
    //     </Card>

    //     <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
    //       {/* Left: list */}
    //       <Card className="overflow-hidden border-slate-200 shadow-sm">
    //         <CardHeader className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-emerald-50/40">
    //           <div className="space-y-4">
    //             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    //               <div>
    //                 <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
    //                   Jobs
    //                 </CardTitle>
    //                 <p className="mt-1 text-sm text-slate-500">
    //                   Click a job to open details and continue work
    //                 </p>
    //               </div>
    //               <Button
    //                 variant="outline"
    //                 className="rounded-xl border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
    //                 onClick={() => router.push("/technician/dashboard")}
    //               >
    //                 Back to dashboard
    //                 <ArrowRight className="ml-2 h-4 w-4" />
    //               </Button>
    //             </div>

    //             <div className="flex flex-col gap-3 lg:flex-row">
    //               <div className="relative flex-1">
    //                 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    //                 <Input
    //                   value={query}
    //                   onChange={(e) => setQuery(e.target.value)}
    //                   placeholder="Search customer, phone, service, city..."
    //                   className="h-11 rounded-2xl border-slate-200 bg-white pl-10 shadow-sm"
    //                 />
    //               </div>

    //               <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
    //                 {[
    //                   ["all", "All"],
    //                   ["assigned", "Assigned"],
    //                   ["active", "Active"],
    //                   ["completed", "Completed"],
    //                 ].map(([key, label]) => (
    //                   <button
    //                     key={key}
    //                     onClick={() => setFilter(key as any)}
    //                     className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
    //                       filter === key
    //                         ? "border-emerald-300 bg-emerald-50 text-emerald-700"
    //                         : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    //                     }`}
    //                   >
    //                     {label}
    //                   </button>
    //                 ))}
    //               </div>
    //             </div>
    //           </div>
    //         </CardHeader>

    //         <CardContent className="p-4">
    //           {isLoading ? (
    //             <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
    //               Loading jobs...
    //             </div>
    //           ) : filteredJobs.length === 0 ? (
    //             <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
    //               No jobs found.
    //             </div>
    //           ) : (
    //             <ScrollArea className="h-[72vh] pr-2">
    //               <div className="space-y-3">
    //                 {filteredJobs.map((job: any) => {
    //                   const customer = job.bookingId?.customerId;
    //                   const active = selectedJobId === job._id;
    //                   const payment = job.paymentStatus || "unbilled";

    //                   return (
    //                     <button
    //                       key={job._id}
    //                       onClick={() => {
    //                         setSelectedJobId(job._id);
    //                         router.push(`/technician/jobs?jobId=${job._id}`);
    //                       }}
    //                       className={`w-full rounded-3xl border p-4 text-left transition ${
    //                         active
    //                           ? "border-emerald-300 bg-emerald-50 shadow-sm"
    //                           : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
    //                       }`}
    //                     >
    //                       <div className="flex items-start justify-between gap-3">
    //                         <div className="min-w-0">
    //                           <div className="truncate text-base font-semibold text-slate-900">
    //                             {job.bookingId?.serviceType || "Service job"}
    //                           </div>
    //                           <div className="mt-1 text-sm text-slate-500">
    //                             {customer?.name || "Customer"} • {customer?.phone || "-"}
    //                           </div>
    //                         </div>
    //                         {statusBadge(job.status)}
    //                       </div>

    //                       <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
    //                         <div className="inline-flex items-center gap-1.5">
    //                           <MapPin className="h-3.5 w-3.5" />
    //                           {job.bookingId?.address?.city || job.bookingId?.address?.addressLine || "No address"}
    //                         </div>
    //                         <div className="inline-flex items-center gap-1.5">
    //                           <Clock3 className="h-3.5 w-3.5" />
    //                           {formatDate(job.scheduledAt)}
    //                         </div>
    //                       </div>

    //                       <div className="mt-4 flex flex-wrap items-center gap-2">
    //                         {paymentBadge(payment)}
    //                         {job.proofRequired ? (
    //                           <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
    //                             Proof required
    //                           </Badge>
    //                         ) : null}
    //                         {job.chatUnreadCount > 0 ? (
    //                           <Badge className="rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
    //                             {job.chatUnreadCount} unread message{job.chatUnreadCount > 1 ? "s" : ""}
    //                           </Badge>
    //                         ) : null}
    //                       </div>
    //                     </button>
    //                   );
    //                 })}
    //               </div>
    //             </ScrollArea>
    //           )}
    //         </CardContent>
    //       </Card>

    //       {/* Right: details */}
    //       <Card className="overflow-hidden border-slate-200 shadow-sm">
    //         <CardHeader className="border-b border-slate-100 bg-linear-to-r from-white to-emerald-50/40">
    //           <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
    //             Job details
    //           </CardTitle>
    //           <p className="text-sm text-slate-500">
    //             Customer, address, OTP, payment, proof, and chat info
    //           </p>
    //         </CardHeader>

    //         <CardContent className="p-4">
    //           {!selectedJob ? (
    //             <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
    //               Select a job from the list to view details.
    //             </div>
    //           ) : (
    //             <div className="space-y-5">
    //               <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
    //                 <div className="flex items-start justify-between gap-4">
    //                   <div>
    //                     <div className="text-lg font-semibold text-slate-900">
    //                       {selectedJob.bookingId?.serviceType || "Service job"}
    //                     </div>
    //                     <div className="mt-1 text-sm text-slate-600">
    //                       {selectedJob.bookingId?.customerId?.name || "Customer"} • {selectedJob.bookingId?.customerId?.phone || "-"}
    //                     </div>
    //                     <div className="mt-1 text-sm text-slate-500">
    //                       {selectedJob.bookingId?.address?.addressLine || "Address not added"}
    //                     </div>
    //                   </div>
    //                   {statusBadge(selectedJob.status)}
    //                 </div>

    //                 <div className="mt-4 flex flex-wrap gap-2">
    //                   {paymentBadge(selectedJob.paymentStatus)}
    //                   {selectedJob.proofRequired ? (
    //                     <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">Proof required</Badge>
    //                   ) : null}
    //                   <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
    //                     OTP: {selectedJob.otp ? "Available" : "Missing"}
    //                   </Badge>
    //                 </div>
    //               </div>

    //               <div className="grid gap-3 sm:grid-cols-2">
    //                 <DetailRow label="Scheduled at" value={formatDate(selectedJob.scheduledAt)} />
    //                 <DetailRow label="OTP expires" value={formatDate(selectedJob.otpExpiresAt)} />
    //                 <DetailRow label="OTP countdown" value={formatCountdown(selectedJob.otpExpiresAt)} />
    //                 <DetailRow label="Payment status" value={selectedJob.paymentStatus || "unbilled"} />
    //                 <DetailRow label="Proof files" value={String(selectedJob.proofIds?.length || 0)} />
    //                 <DetailRow label="Unread chat" value={String(selectedJob.chatUnreadCount || 0)} />
    //               </div>

    //               <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    //                 <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
    //                   <Phone className="h-4 w-4 text-emerald-600" />
    //                   Customer address
    //                 </div>
    //                 <div className="mt-3 grid gap-3 sm:grid-cols-2">
    //                   <DetailRow
    //                     label="Address line"
    //                     value={selectedJob.bookingId?.address?.addressLine || selectedJob.bookingId?.customerId?.addresses?.[0]?.addressLine || "-"}
    //                   />
    //                   <DetailRow
    //                     label="City"
    //                     value={selectedJob.bookingId?.address?.city || selectedJob.bookingId?.customerId?.addresses?.[0]?.city || "-"}
    //                   />
    //                   <DetailRow
    //                     label="State"
    //                     value={selectedJob.bookingId?.address?.state || selectedJob.bookingId?.customerId?.addresses?.[0]?.state || "-"}
    //                   />
    //                   <DetailRow
    //                     label="Pincode"
    //                     value={selectedJob.bookingId?.address?.pincode || selectedJob.bookingId?.customerId?.addresses?.[0]?.pincode || "-"}
    //                   />
    //                 </div>
    //               </div>

    //               <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    //                 <div className="text-sm font-medium text-slate-900">Quick actions</div>
    //                 <p className="mt-1 text-xs text-slate-500">
    //                   Use these shortcuts to continue the current job flow.
    //                 </p>

    //                 <div className="mt-4 grid gap-3 sm:grid-cols-2">
    //                   <Button
    //                     className="h-11 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
    //                     onClick={() => router.push(`/technician/jobs?jobId=${selectedJob._id}`)}
    //                   >
    //                     Open job workflow
    //                   </Button>
    //                   <Button
    //                     variant="outline"
    //                     className="h-11 rounded-2xl border-slate-200 bg-white"
    //                     onClick={() => router.push(`/technician/jobs?jobId=${selectedJob._id}&tab=chat`)}
    //                   >
    //                     <MessageCircle className="mr-2 h-4 w-4" />
    //                     Open chat
    //                   </Button>
    //                 </div>
    //               </div>

    //               <div className="rounded-3xl border border-slate-200 bg-linear-to-r from-emerald-50 to-cyan-50 p-4 text-sm text-slate-700">
    //                 <div className="font-medium text-slate-900">Notes</div>
    //                 <p className="mt-2">
    //                   {selectedJob.notes || "No notes available for this job."}
    //                 </p>
    //               </div>
    //             </div>
    //           )}
    //         </CardContent>
    //       </Card>
    //     </div>
    //   </div>
    // </div>

     <div className="space-y-8 bg-background text-foreground">
      {/* Header */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border/70 bg-muted/30 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Technician job workspace
                </div>

                <div className="space-y-2">
                  <h1 className="font-poppins text-3xl font-semibold tracking-tight sm:text-4xl">
                    My jobs
                  </h1>
                  <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                    Review each job, track service progress, check payment state,
                    open proof records, and keep the service flow organized.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <MiniMetric label="Total" value={stats.total} icon={<Wrench className="h-4 w-4" />} />
                <MiniMetric label="Assigned" value={stats.assigned} icon={<Clock3 className="h-4 w-4" />} />
                <MiniMetric label="Active" value={stats.active} icon={<Activity className="h-4 w-4" />} />
                <MiniMetric label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4" />} />
                <MiniMetric label="Paid" value={stats.paid} icon={<Receipt className="h-4 w-4" />} />
                <MiniMetric label="Proofs" value={stats.withProof} icon={<Camera className="h-4 w-4" />} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main layout */}
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.05fr]">
        {/* Left: list */}
        <Card className="overflow-hidden border-border bg-card shadow-sm sticky top-4 h-fit">
          <CardHeader className="space-y-4 border-b border-border/70">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-xl font-semibold">Jobs</CardTitle>
              <CardDescription>
                Tap a job to open the full operational detail view.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customer, phone, service, city..."
                  className="h-11 rounded-2xl pl-10 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:w-auto">
                {[
                  ["all", "All"],
                  ["assigned", "Assigned"],
                  ["active", "Active"],
                  ["completed", "Completed"],
                  ["paid", "Paid"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`rounded-2xl border px-1 py-2 text-xs font-medium transition ${
                      filter === key
                        ? "border-slate-900  bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Loading jobs...
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No jobs found.
              </div>
            ) : (
              <ScrollArea className="h-[90vh] pr-2">
                <div className="space-y-3">
                  {filteredJobs.map((job: any) => {
                    const active = selectedJobId === job._id;
                    const customer = job.bookingId?.customerId;
                    const proofCount = (job.proofIds || []).length;
                    const payment = job.paymentStatus || "unbilled";

                    return (
                      <button
                        key={job._id}
                        onClick={() => setSelectedJobId(job._id)}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
                            : "border-border bg-background hover:border-slate-300 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                                  active
                                    ? "border-white/10 bg-white/10 text-white dark:border-slate-300 dark:bg-slate-950 dark:text-white"
                                    : "border-border bg-muted/40 text-foreground"
                                }`}
                              >
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-base font-semibold">
                                  {job.bookingId?.serviceType || "Service job"}
                                </div>
                                <div
                                  className={`mt-1 text-sm ${
                                    active ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"
                                  }`}
                                >
                                  {customer?.name || "Customer"} • {customer?.phone || "-"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {statusBadge(job.status)}
                        </div>

                        <div
                          className={`mt-4 grid gap-2 text-xs ${
                            active ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"
                          } sm:grid-cols-2`}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {address?.city || address?.addressLine || "No address"}
                          </div>
                          <div className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(job.scheduledAt)}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {paymentBadge(payment)}
                          {proofBadge(proofCount)}
                          {job.proofRequired ? (
                            <Badge className={`rounded-full ${
                              active
                                ? "border-white/10 bg-white/10 text-white dark:border-slate-300 dark:bg-slate-100 dark:text-slate-700"
                                : "border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/10 dark:text-violet-400"
                            }`}>
                              Proof required
                            </Badge>
                          ) : null}
                          {job.chatUnreadCount > 0 ? (
                            <Badge className="rounded-full border-cyan-500/20 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-400">
                              {job.chatUnreadCount} unread
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
        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <CardTitle className="text-xl font-semibold">Job details</CardTitle>
            <CardDescription>
              Everything the technician needs in one view.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4">
            {!selectedJob ? (
              <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Select a job from the list to view details.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Top summary */}
                <div className="rounded-3xl border border-border bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {selectedJob.bookingId?.serviceType || "Service job"}
                        </h3>
                        {statusBadge(selectedJob.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Job ID: {selectedJob._id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {formatDate(selectedJob.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => copyText(selectedJob.otp, "OTP copied")}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy OTP
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => copyText(selectedJob._id, "Job ID copied")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Copy ID
                      </Button>
                      <Button
                        className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                        onClick={() => refetch?.()}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {paymentBadge(selectedJob.paymentStatus)}
                    {proofBadge((selectedJob.proofIds || []).length)}
                    <Badge className="rounded-full border-border bg-background text-muted-foreground">
                      OTP: {selectedJob.otp ? "Available" : "Missing"}
                    </Badge>
                    <Badge className="rounded-full border-border bg-background text-muted-foreground">
                      Payment: {selectedJob.paymentMethod || "N/A"}
                    </Badge>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniMetric
                    label="Estimated price"
                    value={selectedJob.bookingId?.estimatedPrice != null ? `₹${selectedJob.bookingId.estimatedPrice}` : "-"}
                    icon={<Landmark className="h-4 w-4" />}
                  />
                  <MiniMetric
                    label="OTP expiry"
                    value={formatCountdown(selectedJob.otpExpiresAt)}
                    icon={<Ticket className="h-4 w-4" />}
                  />
                  <MiniMetric
                    label="Unread chat"
                    value={selectedJob.chatUnreadCount || 0}
                    icon={<MessageSquare className="h-4 w-4" />}
                  />
                  <MiniMetric
                    label="Proof files"
                    value={(selectedJob.proofIds || []).length}
                    icon={<Camera className="h-4 w-4" />}
                  />
                </div>

                {/* Customer */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Customer</div>
                      <div className="text-sm text-muted-foreground">
                        Booking customer information and contact details.
                      </div>
                    </div>

                    <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                      {selectedJob.bookingId?.scheduledAt ? formatDateOnly(selectedJob.bookingId.scheduledAt) : "-"}
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border border-border">
                          <AvatarFallback className="bg-background text-sm font-semibold text-foreground">
                            {getInitials(customer?.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-foreground">
                            {customer?.name || "Customer"}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {customer?.email || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <DetailRow
                          label="Phone"
                          value={customer?.phone || "-"}
                        />
                        <DetailRow
                          label="Customer OTP"
                          value={
                            <span className="inline-flex items-center gap-2">
                              {selectedJob.otp || "-"}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-lg px-2"
                                onClick={() => copyText(selectedJob.otp, "OTP copied")}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </span>
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <DetailRow
                        label="Address line"
                        value={address?.addressLine || customer?.addresses?.[0]?.addressLine || "-"}
                      />
                      <DetailRow
                        label="City"
                        value={address?.city || customer?.addresses?.[0]?.city || "-"}
                      />
                      <DetailRow
                        label="State"
                        value={address?.state || customer?.addresses?.[0]?.state || "-"}
                      />
                      <DetailRow
                        label="Pincode"
                        value={address?.pincode || customer?.addresses?.[0]?.pincode || "-"}
                      />
                    </div>
                  </div>

                  {mapUrl ? (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full rounded-2xl"
                        onClick={() => window.open(mapUrl, "_blank", "noopener,noreferrer")}
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Open customer location
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* Job flow timeline */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Job timeline</div>
                      <div className="text-sm text-muted-foreground">
                        Track the service journey from acceptance to completion.
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <TimelineItem
                      title="Accepted"
                      value={selectedJob.acceptedAt ? "Technician accepted the job" : null}
                      time={selectedJob.acceptedAt}
                      active={!!selectedJob.acceptedAt}
                    />
                    <TimelineItem
                      title="Arrived"
                      value={selectedJob.arrivedAt ? "Technician reached the customer location" : null}
                      time={selectedJob.arrivedAt}
                      active={!!selectedJob.arrivedAt}
                    />
                    <TimelineItem
                      title="Customer OTP verified"
                      value={selectedJob.customerOtpVerifiedAt ? "Customer OTP was verified successfully" : null}
                      time={selectedJob.customerOtpVerifiedAt}
                      active={!!selectedJob.customerOtpVerifiedAt}
                    />
                    <TimelineItem
                      title="Service started"
                      value={selectedJob.startTime ? "Work has started" : null}
                      time={selectedJob.startTime}
                      active={!!selectedJob.startTime}
                    />
                    <TimelineItem
                      title="Proof submitted"
                      value={selectedJob.proofSubmittedAt ? "Proof uploaded after work" : null}
                      time={selectedJob.proofSubmittedAt}
                      active={!!selectedJob.proofSubmittedAt}
                    />
                    <TimelineItem
                      title="Completed"
                      value={selectedJob.endTime ? "Job completed successfully" : null}
                      time={selectedJob.endTime}
                      active={selectedJob.status === "completed"}
                    />
                  </div>
                </div>

                {/* Payment */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Payment</div>
                      <div className="text-sm text-muted-foreground">
                        Billing, receipt, and payout data.
                      </div>
                    </div>

                    {paymentBadge(selectedJob.paymentStatus)}
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow
                      label="Payment method"
                      value={selectedJob.paymentMethod || "-"}
                    />
                    <DetailRow
                      label="Payment received"
                      value={formatDate(selectedJob.paymentReceivedAt)}
                    />
                    <DetailRow
                      label="Invoice"
                      value={selectedJob.invoiceId || "-"}
                    />
                    <DetailRow
                      label="Payment count"
                      value={selectedJob.paymentCount || selectedJob.paymentStatus ? "Recorded" : "-"}
                    />
                  </div>
                </div>

                {/* Technician related */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Service notes</div>
                      <div className="text-sm text-muted-foreground">
                        Technician-specific reference data and activity flags.
                      </div>
                    </div>
                    <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                      {selectedJob.proofRequired ? "Proof required" : "Proof not required"}
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow
                      label="Assigned by"
                      value={selectedJob.assignedBy || "-"}
                    />
                    <DetailRow
                      label="Conversation"
                      value={selectedJob.conversationsId || "-"}
                    />
                    <DetailRow
                      label="Proof IDs"
                      value={
                        <div className="flex flex-wrap gap-2">
                          {(selectedJob.proofIds || []).length ? (
                            selectedJob.proofIds.map((id: string) => (
                              <Badge
                                key={id}
                                className="rounded-full border-border bg-muted text-muted-foreground"
                              >
                                {id.slice(-6).toUpperCase()}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">No proof uploaded</span>
                          )}
                        </div>
                      }
                    />
                    <DetailRow
                      label="Parts used"
                      value={
                        (selectedJob.partsUsed || []).length
                          ? `${selectedJob.partsUsed.length} item(s)`
                          : "-"
                      }
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-3xl border border-border bg-muted/20 p-5">
                  <div className="text-sm font-semibold text-foreground">Notes</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedJob.notes || "No notes available for this job."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// ```

// Your sample job data is especially useful because it lets the list page show more than just the status: customer identity, service type, scheduled time, address, OTP expiry, payment state, proof requirement, unread chat count, and notes all fit naturally into the technician workflow. fileciteturn5file0turn5file0

// One small note: the page above assumes you have a route like `/technician/jobs?jobId=...` or `/technician/jobs/[id]` to open the workflow view. If your route is different, I can align the navigation to it in the next pass.
