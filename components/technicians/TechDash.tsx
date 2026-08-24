"use client";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ChatWindow from "@/components/chat/ChatWindow";
import JobChatPanel from "@/components/chat/JobChatPanel";
import CollectPaymentActions from "@/components/payments/CollectPaymentActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  useAcceptTechnicianJob,
  useArriveTechnicianJob,
  useCompleteTechnicianJob,
  useStartTechnicianJob,
  useTechnicianJobs,
  useUploadTechnicianProof,
} from "@/hooks/useTechnicianJobs";
import { uploadToCloudinary } from "@/lib/cloudinary";

import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CircleDot,
  FileImage,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  PhoneCall,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Truck,
  Wrench,
  CalendarDays,
  Navigation,
  User2,
  Wallet,
  Activity,
  Receipt,
  ArrowUpRight,
  ClipboardCopyIcon,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { useEffect, useMemo, useState } from "react";
import ChatBtn from "../chat/ChatBtn";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import JobPartsUsed from "./jobPartUsed";



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

function formatTime(date?: string | Date | null) {
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

  const totalMinutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();

  if (["completed", "done", "closed"].includes(s)) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Completed
      </Badge>
    );
  }
  if (["accepted", "arrived", "in_progress", "on_hold"].includes(s)) {
    return (
      <Badge className="rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
        Active
      </Badge>
    );
  }
  if (["assigned", "scheduled"].includes(s)) {
    return (
      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
        Assigned
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
      {status || "New"}
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



function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  trend,
  note,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  note?: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm ">
      <CardContent className="flex flex-col items-start gap-4 p-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/50">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            {trend ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {trend}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {note ? (
            <p className="mt-1 text-sm text-muted-foreground">{note}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StepPill({ label, done }: { label: string; done: boolean }) {
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

const statusOrder = [
  "assigned",
  //"accepted", // skipping accepted as it's a quick transition and doesn't have much UI impact
  "enroute",
  "arrived",
  "in_progress",
  "completed",
] as const;

function stepIndex(status: string) {
  return statusOrder.indexOf(status as any);
}

async function filteToDataUrl(file: File) {
  return await new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result));
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
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
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Line */}
      <div className="absolute left-1.5 top-4 bottom-0 w-px bg-border" />

      {/* Dot */}
      <div
        className={`relative z-10 h-3 w-3 rounded-full ${
          active
            ? "bg-emerald-500 ring-4 ring-emerald-500/20"
            : "bg-muted border border-border"
        }`}
      />

      {/* Content */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">
            {title}
          </h4>

          <span className="text-xs text-muted-foreground">
            {time
              ? new Date(time).toLocaleString()
              : "-"}
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {value || "Not recorded yet"}
        </p>
      </div>
    </div>
  );
}

function TechDash({ session }: any) {
  const router = useRouter();
  const { data, isLoading, refetch } = useTechnicianJobs();

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [otp, setOtp] = useState("");
  const [proofNote, setProofNote] = useState("");

  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const acceptJob = useAcceptTechnicianJob();
  const arriveJob = useArriveTechnicianJob();
  const startJob = useStartTechnicianJob();

  const uploadProof = useUploadTechnicianProof();

  const completeJob = useCompleteTechnicianJob();

  const jobs = data?.jobs || [];

  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0]._id);
    }
  }, [jobs, selectedJobId]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job: any) => {
      const service = job.bookingId?.serviceType || "";
      const customer = job.bookingId?.customerId?.name || "";
      const phone = job.bookingId?.customerId?.phone || "";
      const city = job.bookingId?.address?.city || "";
      return `${service} ${customer} ${phone} ${city}`
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, search]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId("");
      return;
    }

    const exists = filteredJobs.some((job: any) => job._id === selectedJobId);
    if (!selectedJobId || !exists) {
      setSelectedJobId(filteredJobs[0]._id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job: any) => job._id === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const recentJobs = useMemo(() => filteredJobs.slice(0, 4), [filteredJobs]);

  const stats = useMemo(() => {
    return {
      assigned: jobs.filter((j: any) =>
        ["assigned", "scheduled"].includes(j.status),
      ).length,
      active: jobs.filter((j: any) =>
        ["accepted", "arrived", "in_progress", "on_hold"].includes(j.status),
      ).length,
      completed: jobs.filter((j: any) => j.status === "completed").length,
      paid:jobs.filter((j:any) => j.status === "paid").length,
      total: jobs.length,
    };
  }, [jobs]);

  async function onUploadProof() {
    if (!selectedJob) return;
    if (proofFiles.length === 0) return;

    try {
      const uploaded = await Promise.all(
        proofFiles.map((file) => uploadToCloudinary(file)),
      );

      const proofs = uploaded.map((item) => ({
        url: item.url,
        type: "photo",
        metadata: {
          public_id: item.public_id,
        },
      }));

      await uploadProof.mutateAsync({
        id: selectedJob._id,
        payload: {
          proofNote,
          proofs,
        },
      });

      setProofFiles([]);
      setProofNote("");
    } catch (err) {
      console.error("Upload error", err);
      alert("Upload failed");
    }
  };

  async function copyJobId(id: string) {
    if(!selectedJob) return;
    try{
      await navigator.clipboard.writeText(selectedJob._id);
      toast.success("Job ID copied to clipboard");
    }catch{
      toast.error("Failed to copy Job ID");
    }
  }

  const progress = selectedJob
    ? Math.max(0, stepIndex(selectedJob.status) + 1)
    : 0;

  if (!session?.user) return <div>Loading...</div>;

  const customer = selectedJob?.bookingId?.customerId;
  const address = selectedJob?.bookingId?.address;
  const coords = address?.location?.coordinates || [];
  const mapUrl =
    coords.length === 2
      ? `https://www.google.com/maps?q=${coords[1]},${coords[0]}`
      : null;

  return (
    
    <div className="space-y-8 bg-background px-4 py-4 text-foreground sm:px-6">
      {/* Hero */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border/70 bg-muted/30 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Technician workspace
                </div>
                <div className="space-y-2">
                  <h1 className="font-poppins text-3xl font-semibold tracking-tight sm:text-4xl">
                    My jobs, OTP, proof, and completion
                  </h1>
                  <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                    Track each assignment from acceptance to completion with a
                    clean mobile-friendly workflow.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                <MetricCard
                  label="Assigned"
                  value={stats.assigned}
                  icon={<ClipboardList className="h-5 w-5" />}
                  note="Waiting or scheduled"
                />
                <MetricCard
                  label="Active"
                  value={stats.active}
                  icon={<Activity className="h-5 w-5" />}
                  note="In progress now"
                />
                <MetricCard
                  label="Completed"
                  value={stats.completed}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  note="Finished jobs"
                />
                <MetricCard
                  label="Paid"
                  value={stats.paid}
                  icon={<Wallet className="h-5 w-5" />}
                  note="Payment recorded"
                />
                <MetricCard
                  label="Total"
                  value={stats.total}
                  icon={<Wrench className="h-5 w-5" />}
                  note="All loaded jobs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* Left panel */}
        <Card className="overflow-hidden border-border bg-card shadow-sm sticky top-4 h-fit">
          <CardHeader className="space-y-4 border-b border-border/70">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Recent jobs
                </CardTitle>
                <CardDescription>
                  Open any job to continue the service flow.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => refetch?.()}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search service, customer, phone, city..."
                className="h-11 rounded-2xl pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="rounded-full border border-border bg-muted text-muted-foreground"
              >
                All
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border border-border bg-muted text-muted-foreground"
              >
                Assigned
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border border-border bg-muted text-muted-foreground"
              >
                Active
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border border-border bg-muted text-muted-foreground"
              >
                Proof
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-3xl border border-dashed border-border p-5"
                  >
                    <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                    <div className="mt-3 h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="h-9 animate-pulse rounded-xl bg-muted" />
                      <div className="h-9 animate-pulse rounded-xl bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No assigned jobs yet.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-3">
                    {recentJobs.map((job: any) => {
                      const customerName =
                        job.bookingId?.customerId?.name || "Customer";
                      const customerPhone =
                        job.bookingId?.customerId?.phone || "-";
                      const active = selectedJobId === job._id;
                      const proofCount = (job.proofIds || []).length;

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
                                <Avatar className="h-11 w-11 border border-border">
                                  <AvatarFallback
                                    className={`text-sm font-semibold ${
                                      active
                                        ? "bg-white text-slate-950 dark:bg-slate-950 dark:text-white"
                                        : "bg-muted text-foreground"
                                    }`}
                                  >
                                    {getInitials(customerName)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0">
                                  <div className="truncate text-base font-semibold">
                                    {job.bookingId?.serviceType ||
                                      "Service job"}
                                  </div>
                                  <div
                                    className={`mt-1 truncate text-sm ${
                                      active
                                        ? "text-white/70 dark:text-slate-600"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {customerName} • {customerPhone}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {statusBadge(job.status)}
                          </div>

                          <div
                            className={`mt-4 grid gap-2 text-xs sm:grid-cols-2 ${
                              active
                                ? "text-white/70 dark:text-slate-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.bookingId?.address?.city ||
                                job.bookingId?.address?.addressLine ||
                                "No address"}
                            </div>
                            <div className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(job.scheduledAt)}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {paymentBadge(job.paymentStatus)}
                            {proofBadge(proofCount)}
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
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-foreground">
                      All jobs
                    </div>
                    <button
                      onClick={() => router.push("/technician/jobs")}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Open full list
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {filteredJobs.slice(0, 6).map((job: any) => (
                      <button
                        key={job._id}
                        onClick={() => setSelectedJobId(job._id)}
                        className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30 dark:hover:bg-muted/30"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {job.bookingId?.serviceType || "Service job"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {job.bookingId?.customerId?.name || "Customer"}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {statusBadge(job.status)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right panel */}
        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Job workflow
            </CardTitle>
            <CardDescription>
              Select a job to continue the service flow.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4">
            {!selectedJob ? (
              <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Select a job from the list to start working.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Top summary */}
                <div className="rounded-3xl border border-border bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {selectedJob.bookingId?.serviceType || "Service job"}
                        </h3>
                        {statusBadge(selectedJob.status)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {customer?.name || "Customer"} •{" "}
                        {customer?.phone || "-"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {address?.addressLine || "Address not added yet"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => router.push("/technician/jobs")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Open list
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => copyJobId(selectedJob._id)}
                      >
                        <ClipboardCopyIcon className="mr-2 h-4 w-4" />
                        Copy ID
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {paymentBadge(selectedJob.paymentStatus)}
                    {proofBadge((selectedJob.proofIds || []).length)}
                    <Badge className="rounded-full border-border bg-background text-muted-foreground">
                      OTP: {selectedJob.otp ? "Available" : "Missing"}
                    </Badge>
                  </div>
                </div>

                {/* Progress */}
                <div className="grid gap-2 sm:grid-cols-5">
                  <StepPill label="Assigned" done={progress >= 1} />
                  <StepPill label="En route" done={progress >= 2} />
                  <StepPill label="Arrived" done={progress >= 3} />
                  <StepPill label="Started" done={progress >= 4} />
                  <StepPill label="Completed" done={progress >= 5} />
                </div>

                {/* Metrics */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Estimated price"
                    value={
                      selectedJob.bookingId?.estimatedPrice != null
                        ? `₹${selectedJob.bookingId.estimatedPrice}`
                        : "-"
                    }
                    icon={<Wallet className="h-5 w-5" />}
                  />
                  <MetricCard
                    label="OTP expires in"
                    value={formatCountdown(selectedJob.otpExpiresAt)}
                    icon={<TimerReset className="h-5 w-5" />}
                  />
                  <MetricCard
                    label="Unread chat"
                    value={selectedJob.chatUnreadCount || 0}
                    icon={<MessageSquare className="h-5 w-5" />}
                  />
                  <MetricCard
                    label="Proof files"
                    value={(selectedJob.proofIds || []).length}
                    icon={<Camera className="h-5 w-5" />}
                  />
                </div>

                {/* Customer info */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Customer & booking
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Customer details, service, schedule, and address.
                      </div>
                    </div>

                    <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                      {selectedJob.scheduledAt
                        ? formatDateOnly(selectedJob.scheduledAt)
                        : "-"}
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
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
                          label="Address line"
                          value={
                            address?.addressLine ||
                            customer?.addresses?.[0]?.addressLine ||
                            "-"
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <DetailRow
                        label="City"
                        value={
                          address?.city || customer?.addresses?.[0]?.city || "-"
                        }
                      />
                      <DetailRow
                        label="State"
                        value={
                          address?.state ||
                          customer?.addresses?.[0]?.state ||
                          "-"
                        }
                      />
                      <DetailRow
                        label="Pincode"
                        value={
                          address?.pincode ||
                          customer?.addresses?.[0]?.pincode ||
                          "-"
                        }
                      />
                    </div>
                  </div>

                  {mapUrl ? (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full rounded-2xl"
                        onClick={() =>
                          window.open(mapUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Open customer location
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* Timeline */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="text-sm font-semibold text-foreground">
                    Job timeline
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track the service journey from acceptance to completion.
                  </p>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <TimelineItem
                      title="Accepted"
                      value={
                        selectedJob.acceptedAt
                          ? "Technician accepted the job"
                          : null
                      }
                      time={selectedJob.acceptedAt}
                      active={!!selectedJob.acceptedAt}
                    />
                    <TimelineItem
                      title="Arrived"
                      value={
                        selectedJob.arrivedAt
                          ? "Reached customer location"
                          : null
                      }
                      time={selectedJob.arrivedAt}
                      active={!!selectedJob.arrivedAt}
                    />
                    <TimelineItem
                      title="Customer OTP verified"
                      value={
                        selectedJob.customerOtpVerifiedAt
                          ? "OTP verified successfully"
                          : null
                      }
                      time={selectedJob.customerOtpVerifiedAt}
                      active={!!selectedJob.customerOtpVerifiedAt}
                    />
                    <TimelineItem
                      title="Service started"
                      value={selectedJob.startTime ? "Work started" : null}
                      time={selectedJob.startTime}
                      active={!!selectedJob.startTime}
                    />
                    <TimelineItem
                      title="Proof submitted"
                      value={
                        selectedJob.proofSubmittedAt ? "Proof uploaded" : null
                      }
                      time={selectedJob.proofSubmittedAt}
                      active={!!selectedJob.proofSubmittedAt}
                    />
                    <TimelineItem
                      title="Completed"
                      value={selectedJob.endTime ? "Job completed" : null}
                      time={selectedJob.endTime}
                      active={selectedJob.status === "completed"}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="text-sm font-semibold text-foreground">
                    Workflow actions
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Continue the job step by step.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button
                      className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                      onClick={() => acceptJob.mutate(selectedJob._id)}
                      disabled={
                        !["assigned", "scheduled"].includes(
                          (selectedJob.status || "").toLowerCase(),
                        ) || acceptJob.isPending
                      }
                    >
                      {acceptJob.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <BadgeCheck className="mr-2 h-4 w-4" />
                          Accept job
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl"
                      onClick={() => arriveJob.mutate(selectedJob._id)}
                      // disabled={
                      //   selectedJob.status !== "" || arriveJob.isPending
                      // }
                    >
                      {arriveJob.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Truck className="mr-2 h-4 w-4" />
                          Mark arrived
                        </>
                      )}
                    </Button>

                    <div className="sm:col-span-2 rounded-3xl border border-border bg-muted/20 p-4">
                      <div className="text-sm font-medium text-foreground">
                        Start with OTP
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Enter the customer OTP after reaching the site.
                      </p>

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <Input
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Enter OTP"
                          className="h-11 rounded-2xl"
                          disabled={selectedJob.status !== "arrived"}
                        />
                        <Button
                          className="h-11 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                          onClick={() =>
                            startJob.mutate({ id: selectedJob._id, otp })
                          }
                          disabled={
                            selectedJob.status !== "arrived" ||
                            startJob.isPending
                          }
                        >
                          {startJob.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Verify OTP & start"
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="h-11 rounded-2xl bg-linear-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-700 hover:to-emerald-700 sm:col-span-2"
                      onClick={() => completeJob.mutate(selectedJob._id)}
                      disabled={
                        selectedJob.status !== "in_progress" ||
                        completeJob.isPending
                      }
                    >
                      {completeJob.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete job
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Proof upload */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Proof upload
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Upload photos and add a note after the work is finished.
                      </div>
                    </div>
                    <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                      {proofFiles.length} file
                      {proofFiles.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      placeholder="Add a short proof note"
                      className="min-h-24 rounded-2xl"
                    />

                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        setProofFiles(Array.from(e.target.files || []))
                      }
                      className="rounded-2xl"
                    />

                    <Button
                      className="h-11 rounded-2xl bg-linear-to-r from-sky-600 to-emerald-600 text-white hover:from-sky-700 hover:to-emerald-700"
                      onClick={onUploadProof}
                      disabled={
                        proofFiles.length === 0 || uploadProof.isPending
                      }
                    >
                      {uploadProof.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FileImage className="mr-2 h-4 w-4" />
                          Upload proof
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-3xl border border-border bg-muted/20 p-5">
                  <div className="text-sm font-semibold text-foreground">
                    Service notes
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedJob.notes || "No notes available for this job."}
                  </p>
                </div>
                {/* adding service part */}
                <div className="rounded-3xl border border-border bg-muted/20 p-5">
                      <div className="text-sm font-semibold text-foreground">
                   Job Part
                  </div>
                  <JobPartsUsed
  // jobId={selectedJob._id}
  // partsUsed={selectedJob.partsUsed || []}
  // jobStatus={selectedJob.status}
  // onUpdated={(updatedParts) => {
  //   setSelectedJobId((current: any) => ({
  //     ...current,
  //     partsUsed:
  //       updatedParts,
  //   }));
  // }}
  jobId={selectedJob._id}
  partsUsed={selectedJob.partsUsed || []}
  jobStatus={selectedJob.status}
/>
                </div>

                {/* Chat */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Customer chat
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Open the conversation linked to this job.
                      </div>
                    </div>
                    <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                      {selectedJob.chatUnreadCount || 0} unread
                    </Badge>
                  </div>

                  <div className="mt-4">
                    {selectedJob ? (
                      <JobChatPanel
                        jobId={selectedJob._id}
                        currentUserId={session.user.id}
                        currentUserRole={session.user.role}
                        currentUserName={session.user.name}
                        triggerLabel="Open chat"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TechDash;
