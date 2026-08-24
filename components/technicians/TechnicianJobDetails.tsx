"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  FileImage,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  PackagePlus,
  Phone,
  ShieldCheck,
  TimerReset,
  Truck,
  User2,
  Wallet,
  Wrench,
} from "lucide-react";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Input,
} from "@/components/ui/input";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  Separator,
} from "@/components/ui/separator";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

import JobChatPanel from "@/components/chat/JobChatPanel";

import JobPartsUsed from "./jobPartUsed";

import {
  toast,
} from "sonner";

import { cn } from "@/lib/utils";

function formatDate(
  date?: string | Date | null,
) {
  if (!date) return "-";

  try {
    return new Date(
      date,
    ).toLocaleString(undefined, {
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

function formatDateOnly(
  date?: string | Date | null,
) {
  if (!date) return "-";

  try {
    return new Date(
      date,
    ).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  } catch {
    return "-";
  }
}

function formatCountdown(
  expiresAt?: string | Date | null,
) {
  if (!expiresAt) return "-";

  const diff =
    new Date(
      expiresAt,
    ).getTime() -
    Date.now();

  if (Number.isNaN(diff)) {
    return "-";
  }

  if (diff <= 0) {
    return "Expired";
  }

  const totalMinutes =
    Math.floor(
      diff / 1000 / 60,
    );

  const hours =
    Math.floor(
      totalMinutes / 60,
    );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getInitials(
  name?: string,
) {
  if (!name) return "J";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase(),
    )
    .join("");
}

function statusBadge(
  status?: string,
) {
  const value =
    (
      status || ""
    ).toLowerCase();

  if (
    value === "completed"
  ) {
    return (
      <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
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
      <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
        Active
      </Badge>
    );
  }

  if (
    [
      "assigned",
      "scheduled",
    ].includes(value)
  ) {
    return (
      <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        Assigned
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-border bg-muted text-muted-foreground">
      {status || "New"}
    </Badge>
  );
}

function StepPill({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2 text-center text-sm font-medium transition",
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      {label}
    </div>
  );
}

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

      <div className="absolute bottom-0 left-1.5 top-4 w-px bg-border" />

      <div
        className={cn(
          "relative z-10 h-3 w-3 rounded-full",
          active
            ? "bg-emerald-500 ring-4 ring-emerald-500/20"
            : "border border-border bg-muted",
        )}
      />

      <div className="flex-1">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">
            {title}
          </h4>

          <span className="text-xs text-muted-foreground">
            {time
              ? new Date(
                  time,
                ).toLocaleString()
              : "-"}
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {value ||
            "Not recorded yet"}
        </p>

      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  note?: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/50">
          {icon}
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
          {value}
        </p>

        {note && (
          <p className="mt-1 text-xs text-muted-foreground">
            {note}
          </p>
        )}

      </CardContent>
    </Card>
  );
}

export default function TechnicianJobDetail({
  session,
  jobId,
}: {
  session: any;
  jobId: string;
}) {
  const router =
    useRouter();

  const {
    data,
    isLoading,
    refetch,
  } = useTechnicianJobs();

  const [
    otp,
    setOtp,
  ] = useState("");

  const [
    proofNote,
    setProofNote,
  ] = useState("");

  const [
    proofFiles,
    setProofFiles,
  ] = useState<File[]>(
    [],
  );

  const acceptJob =
    useAcceptTechnicianJob();

  const arriveJob =
    useArriveTechnicianJob();

  const startJob =
    useStartTechnicianJob();

  const uploadProof =
    useUploadTechnicianProof();

  const completeJob =
    useCompleteTechnicianJob();

  const jobs =
    data?.jobs || [];

  const job = useMemo(
    () =>
      jobs.find(
        (item: any) =>
          item._id === jobId,
      ) || null,
    [jobs, jobId],
  );

  useEffect(() => {
    if (!job) return;

    setOtp("");
    setProofNote("");
    setProofFiles([]);
  }, [job?._id]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-12 w-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        <div className="h-125 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (!job) {
    return (
      <Card className="rounded-3xl border-dashed">
        <CardContent className="p-12 text-center">

          <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />

          <h2 className="mt-4 text-lg font-semibold">
            Job not found
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            This job is not available in your assigned jobs.
          </p>

          <Button
            className="mt-5 rounded-2xl"
            onClick={() =>
              router.push(
                "/technician/dashboard",
              )
            }
          >
            Back to dashboard
          </Button>

        </CardContent>
      </Card>
    );
  }

  const customer =
    job.bookingId
      ?.customerId;

  const address =
    job.bookingId?.address;

  const coords =
    address
      ?.location
      ?.coordinates || [];

  const mapUrl =
    coords.length === 2
      ? `https://www.google.com/maps?q=${coords[1]},${coords[0]}`
      : null;

  const status =
    (
      job.status || ""
    ).toLowerCase();

  const progress =
    [
      "assigned",
      "enroute",
      "arrived",
      "in_progress",
      "completed",
    ].findIndex(
      (item) => {
        if (
          status ===
          "otp_verified"
        ) {
          return item === "in_progress";
        }

        return (
          item === status
        );
      },
    );

  const canAccept =
    [
      "assigned",
      "scheduled",
    ].includes(
      status,
    );

  const canArrive =
    [
      "accepted",
      "enroute",
    ].includes(
      status,
    );

  const canStart =
    status === "arrived";

  const canComplete =
    [
      "in_progress",
      "on_hold",
    ].includes(
      status,
    );

  async function handleAccept() {
    try {
      await acceptJob.mutateAsync(
        job._id,
      );

      await refetch();

      toast.success(
        "Job accepted",
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.error ||
          error?.message ||
          "Unable to accept job",
      );
    }
  }

  async function handleArrive() {
    try {
      await arriveJob.mutateAsync(
        job._id,
      );

      await refetch();

      toast.success(
        "Marked as arrived",
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.error ||
          error?.message ||
          "Unable to update arrival",
      );
    }
  }

  async function handleStart() {
    if (!otp.trim()) {
      toast.error(
        "Enter the customer OTP",
      );
      return;
    }

    try {
      await startJob.mutateAsync({
        id: job._id,
        otp: otp.trim(),
      });

      setOtp("");

      await refetch();

      toast.success(
        "OTP verified. Job started.",
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.error ||
          error?.message ||
          "Unable to verify OTP",
      );
    }
  }

  async function handleComplete() {
    try {
      const result =
        await completeJob.mutateAsync(
          job._id,
        );

      await refetch();

      toast.success(
        result?.invoice
          ?.invoiceNumber
          ? `Job completed. Invoice ${result.invoice.invoiceNumber} generated.`
          : "Job completed successfully.",
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.error ||
          error?.message ||
          "Unable to complete job",
      );
    }
  }

  async function handleUploadProof() {
    if (
      proofFiles.length === 0
    ) {
      toast.error(
        "Select at least one image",
      );
      return;
    }

    try {
      const uploaded =
        await Promise.all(
          proofFiles.map(
            (file) =>
              uploadToCloudinary(
                file,
              ),
          ),
        );

      const proofs =
        uploaded.map(
          (item) => ({
            url: item.url,
            type: "photo",
            metadata: {
              public_id:
                item.public_id,
            },
          }),
        );

      await uploadProof.mutateAsync(
        {
          id: job._id,
          payload: {
            proofNote,
            proofs,
          },
        },
      );

      setProofFiles([]);
      setProofNote("");

      await refetch();

      toast.success(
        "Proof uploaded",
      );
    } catch (error: any) {
      console.error(
        "Proof upload error",
        error,
      );

      toast.error(
        "Unable to upload proof",
      );
    }
  }

  async function copyJobId() {
    try {
      await navigator.clipboard.writeText(
        job._id,
      );

      toast.success(
        "Job ID copied",
      );
    } catch {
      toast.error(
        "Unable to copy job ID",
      );
    }
  }

  return (
    <div className="space-y-6">

      {/* Back */}
      <Button
        variant="ghost"
        className="-ml-3 rounded-xl"
        onClick={() =>
          router.push(
            "/technician",
          )
        }
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to jobs
      </Button>

      {/* Header */}
      <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">

        <CardContent className="p-0">

          <div className="border-b border-border/70 bg-muted/20 p-6 sm:p-8">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-border bg-background text-muted-foreground">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    Job execution
                  </Badge>

                  {statusBadge(
                    job.status,
                  )}
                </div>

                <h1 className="mt-4 font-poppins text-2xl font-semibold tracking-tight sm:text-3xl">
                  {job.bookingId?.serviceType ||
                    "Service job"}
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                  {customer?.name ||
                    "Customer"}{" "}
                  ·{" "}
                  {customer?.phone ||
                    "-"}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {address?.addressLine ||
                    "Address not added"}
                  {address?.city
                    ? `, ${address.city}`
                    : ""}
                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={
                    copyJobId
                  }
                >
                  <ClipboardCopy className="mr-2 h-4 w-4" />
                  Copy ID
                </Button>

                {mapUrl && (
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() =>
                      window.open(
                        mapUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    Open location
                  </Button>
                )}

              </div>

            </div>

          </div>

          <div className="grid gap-2 p-4 sm:grid-cols-5">
            <StepPill
              label="Assigned"
              done={
                status ===
                  "assigned" ||
                status ===
                  "scheduled" ||
                status ===
                  "accepted" ||
                status ===
                  "enroute" ||
                status ===
                  "arrived" ||
                status ===
                  "otp_verified" ||
                status ===
                  "in_progress" ||
                status ===
                  "on_hold" ||
                status ===
                  "completed"
              }
            />

            <StepPill
              label="En route"
              done={[
                "enroute",
                "arrived",
                "otp_verified",
                "in_progress",
                "on_hold",
                "completed",
              ].includes(
                status,
              )}
            />

            <StepPill
              label="Arrived"
              done={[
                "arrived",
                "otp_verified",
                "in_progress",
                "on_hold",
                "completed",
              ].includes(
                status,
              )}
            />

            <StepPill
              label="Started"
              done={[
                "otp_verified",
                "in_progress",
                "on_hold",
                "completed",
              ].includes(
                status,
              )}
            />

            <StepPill
              label="Completed"
              done={
                status ===
                "completed"
              }
            />
          </div>

        </CardContent>
      </Card>

      {/* Primary action banner */}
      {(canAccept ||
        canArrive ||
        canStart ||
        canComplete) && (
        <Card
          className={cn(
            "rounded-3xl",
            canAccept
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-cyan-500/20 bg-cyan-500/5",
          )}
        >
          <CardContent className="p-5 sm:p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm font-semibold text-foreground">
                  {canAccept
                    ? "Action required"
                    : canArrive
                      ? "Continue your job"
                      : canStart
                        ? "Customer verification required"
                        : "Finish the service"}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {canAccept
                    ? "Review the booking and accept the assignment."
                    : canArrive
                      ? "You are assigned. Mark your arrival when you reach the location."
                      : canStart
                        ? "Enter the customer OTP to start the service."
                        : "Make sure the work and proof are complete before closing the job."}
                </p>
              </div>

              {canAccept && (
                <Button
                  className="h-11 rounded-2xl bg-amber-600 px-6 text-white hover:bg-amber-700"
                  onClick={
                    handleAccept
                  }
                  disabled={
                    acceptJob.isPending
                  }
                >
                  {acceptJob.isPending
                    ? "Accepting..."
                    : "Accept job"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {canArrive && (
                <Button
                  className="h-11 rounded-2xl bg-cyan-600 px-6 text-white hover:bg-cyan-700"
                  onClick={
                    handleArrive
                  }
                  disabled={
                    arriveJob.isPending
                  }
                >
                  {arriveJob.isPending
                    ? "Updating..."
                    : "Mark arrived"}
                  <Truck className="ml-2 h-4 w-4" />
                </Button>
              )}

              {canComplete && (
                <Button
                  className="h-11 rounded-2xl bg-emerald-600 px-6 text-white hover:bg-emerald-700"
                  onClick={
                    handleComplete
                  }
                  disabled={
                    completeJob.isPending
                  }
                >
                  {completeJob.isPending
                    ? "Completing..."
                    : "Complete job"}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              )}

            </div>

          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">

        {/* Main */}
        <div className="space-y-6">

          {/* Customer */}
          <Card className="rounded-3xl border-border bg-card shadow-sm">

            <CardHeader>
              <CardTitle>
                Customer & booking
              </CardTitle>

              <CardDescription>
                Customer details, schedule and service location.
              </CardDescription>
            </CardHeader>

            <CardContent>

              <div className="flex items-center gap-3">

                <Avatar className="h-12 w-12 border border-border">
                  <AvatarFallback className="bg-muted font-semibold text-foreground">
                    {getInitials(
                      customer?.name,
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {customer?.name ||
                      "Customer"}
                  </p>

                  <p className="truncate text-sm text-muted-foreground">
                    {customer?.email ||
                      "-"}
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {customer?.phone ||
                      "-"}
                  </div>
                </div>

              </div>

              <Separator className="my-5" />

              <div className="grid gap-3 sm:grid-cols-2">

                <MetricCard
                  label="Scheduled"
                  value={formatDate(
                    job.scheduledAt,
                  )}
                  icon={
                    <Clock3 className="h-5 w-5" />
                  }
                />

                <MetricCard
                  label="Estimated price"
                  value={
                    job.bookingId
                      ?.estimatedPrice !=
                    null
                      ? `₹${job.bookingId.estimatedPrice}`
                      : "-"
                  }
                  icon={
                    <Wallet className="h-5 w-5" />
                  }
                />

              </div>

              <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Service address
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {address?.addressLine ||
                        "Address not available"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {address?.city ||
                        "-"}
                      {address?.pincode
                        ? `, ${address.pincode}`
                        : ""}
                    </p>
                  </div>
                </div>

              </div>

            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="rounded-3xl border-border bg-card shadow-sm">

            <CardHeader>
              <CardTitle>
                Job timeline
              </CardTitle>

              <CardDescription>
                Track the execution from assignment to completion.
              </CardDescription>
            </CardHeader>

            <CardContent>

              <div className="space-y-4">

                <TimelineItem
                  title="Accepted"
                  value={
                    job.acceptedAt
                      ? "Technician accepted the job"
                      : null
                  }
                  time={
                    job.acceptedAt
                  }
                  active={
                    !!job.acceptedAt
                  }
                />

                <TimelineItem
                  title="Arrived"
                  value={
                    job.arrivedAt
                      ? "Reached customer location"
                      : null
                  }
                  time={
                    job.arrivedAt
                  }
                  active={
                    !!job.arrivedAt
                  }
                />

                <TimelineItem
                  title="Customer OTP verified"
                  value={
                    job.customerOtpVerifiedAt
                      ? "OTP verified successfully"
                      : null
                  }
                  time={
                    job.customerOtpVerifiedAt
                  }
                  active={
                    !!job.customerOtpVerifiedAt
                  }
                />

                <TimelineItem
                  title="Service started"
                  value={
                    job.startTime
                      ? "Work started"
                      : null
                  }
                  time={
                    job.startTime
                  }
                  active={
                    !!job.startTime
                  }
                />

                <TimelineItem
                  title="Proof submitted"
                  value={
                    job.proofSubmittedAt
                      ? "Proof uploaded"
                      : null
                  }
                  time={
                    job.proofSubmittedAt
                  }
                  active={
                    !!job.proofSubmittedAt
                  }
                />

                <TimelineItem
                  title="Completed"
                  value={
                    job.endTime
                      ? "Job completed"
                      : null
                  }
                  time={
                    job.endTime
                  }
                  active={
                    job.status ===
                    "completed"
                  }
                />

              </div>

            </CardContent>
          </Card>

          {/* Parts */}
          <JobPartsUsed
            jobId={job._id}
            partsUsed={
              job.partsUsed ||
              []
            }
            jobStatus={
              job.status
            }
            onUpdated={async () => {
              await refetch();
            }}
          />

          {/* Proof */}
          <Card className="rounded-3xl border-border bg-card shadow-sm">

            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>
                    Proof of service
                  </CardTitle>

                  <CardDescription>
                    Upload photos and add a service note.
                  </CardDescription>
                </div>

                <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                  {proofFiles.length} selected
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">

              <Textarea
                value={proofNote}
                onChange={(event) =>
                  setProofNote(
                    event.target.value,
                  )
                }
                placeholder="Add a short note about the completed work..."
                className="min-h-24 rounded-2xl"
              />

              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) =>
                  setProofFiles(
                    Array.from(
                      event.target
                        .files ||
                        [],
                    ),
                  )
                }
                className="rounded-2xl"
              />

              <Button
                className="h-11 rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700"
                onClick={
                  handleUploadProof
                }
                disabled={
                  proofFiles.length ===
                    0 ||
                  uploadProof.isPending
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

            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="rounded-3xl border-border bg-muted/20 shadow-none">

            <CardHeader>
              <CardTitle>
                Service notes
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {job.notes ||
                  "No notes available for this job."}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Side */}
        <div className="space-y-6">

          {/* Job metrics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">

            <MetricCard
              label="Payment"
              value={
                job.paymentStatus ||
                "unbilled"
              }
              icon={
                <Wallet className="h-5 w-5" />
              }
              note="Current payment state"
            />

            <MetricCard
              label="OTP"
              value={
                job.otp
                  ? "Available"
                  : "Missing"
              }
              icon={
                <TimerReset className="h-5 w-5" />
              }
              note={
                formatCountdown(
                  job.otpExpiresAt,
                )
              }
            />

            <MetricCard
              label="Proof files"
              value={
                (
                  job.proofIds ||
                  []
                ).length
              }
              icon={
                <Camera className="h-5 w-5" />
              }
              note="Uploaded evidence"
            />

            <MetricCard
              label="Chat"
              value={
                job.chatUnreadCount ||
                0
              }
              icon={
                <MessageSquare className="h-5 w-5" />
              }
              note="Unread messages"
            />

          </div>

          {/* OTP */}
          <Card
            className={cn(
              "rounded-3xl shadow-sm",
              canStart
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border bg-card",
            )}
          >
            <CardHeader>
              <CardTitle>
                Customer verification
              </CardTitle>

              <CardDescription>
                Customer OTP is required before starting the service.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="rounded-2xl border border-border bg-background p-4">

                <div className="flex items-center justify-between gap-3">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      OTP status
                    </p>

                    <p className="mt-1 font-semibold text-foreground">
                      {job.otp
                        ? "Available"
                        : "Missing"}
                    </p>
                  </div>

                  {job.otp && (
                    <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                      {formatCountdown(
                        job.otpExpiresAt,
                      )}
                    </Badge>
                  )}

                </div>

              </div>

              <Input
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value,
                  )
                }
                placeholder="Enter customer OTP"
                inputMode="numeric"
                maxLength={6}
                className="h-11 rounded-2xl"
                disabled={
                  !canStart
                }
              />

              <Button
                className="h-11 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={
                  handleStart
                }
                disabled={
                  !canStart ||
                  startJob.isPending
                }
              >
                {startJob.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Verify OTP & start
                  </>
                )}
              </Button>

            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="rounded-3xl border-border bg-card shadow-sm">

            <CardHeader>
              <div className="flex items-center justify-between gap-3">

                <div>
                  <CardTitle>
                    Customer chat
                  </CardTitle>

                  <CardDescription>
                    Chat related to this job.
                  </CardDescription>
                </div>

                <Badge className="rounded-full border-border bg-muted text-muted-foreground">
                  {job.chatUnreadCount ||
                    0}{" "}
                  unread
                </Badge>

              </div>
            </CardHeader>

            <CardContent>
              <JobChatPanel
                jobId={job._id}
                currentUserId={
                  session.user.id
                }
                currentUserRole={
                  session.user.role
                }
                currentUserName={
                  session.user.name
                }
                triggerLabel="Open customer chat"
              />
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Completion footer */}
      {job.status ===
        "completed" && (
        <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <p className="font-semibold text-foreground">
                  Job completed
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  The service has been completed and the workflow is closed.
                </p>
              </div>

            </div>

            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() =>
                router.push(
                  "/technician",
                )
              }
            >
              Back to my jobs
            </Button>

          </CardContent>
        </Card>
      )}

    </div>
  );
}