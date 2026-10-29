"use client";
import { FinalBillPanel } from "@/components/finance/FinalBillPanel";
import { CancellationPanel } from "@/components/finance/BookingActions";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "next-auth";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  FileText,
  Loader2,
  LockKeyhole,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Wallet,
} from "lucide-react";
import { ServiceAddressPreview } from "@/components/maps/ServiceAddressPreview";
import { ProJourney } from "./ProJourney";
import { useJobStatusConnection } from "@/hooks/useJobStatusConnection";
import {
  useAcceptTechnicianJob,
  useArriveTechnicianJob,
  useCompleteTechnicianJob,
  useStartTechnicianJob,
  useTechnicianJob,
  useUploadTechnicianProof,
} from "@/hooks/useTechnicianJobs";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  technicianWorkflow,
  technicianInvoiceId,
  technicianMutationMessage,
  technicianRequestStatus,
  createTechnicianActionGate,
} from "@/lib/technician-workflow.mjs";
import type {
  TechnicianJobDetailResponse,
  TechnicianMutationResponse,
} from "@/lib/technician-job-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import JobChatPanel from "@/components/chat/JobChatPanel";
import JobPartsUsed from "./jobPartUsed";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function dateLabel(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
}
function money(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value)
    : null;
}
function safeProofUrl(value?: string) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
function BackLink() {
  return (
    <Link
      href="/technician/all-jobs"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="size-4" />
      My assigned jobs
    </Link>
  );
}
function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return value ? (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  ) : null;
}
function JobLoadState({
  loading,
  status,
  retry,
  refreshing,
}: {
  loading?: boolean;
  status?: number | null;
  retry: () => void;
  refreshing?: boolean;
}) {
  if (loading)
    return (
      <div
        className="space-y-6"
        role="status"
        aria-label="Loading assigned job"
      >
        <BackLink />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
        <span className="sr-only">Loading your assigned job details</span>
      </div>
    );
  const missing = status === 404,
    denied = status === 401 || status === 403;
  return (
    <div className="space-y-5">
      <BackLink />
      <Card className="rounded-2xl">
        <CardContent className="py-12 text-center" role="alert">
          <TriangleAlert className="mx-auto size-9 text-primary" />
          <h1 className="mt-5 font-display text-2xl font-semibold">
            {missing
              ? "Assigned job unavailable"
              : denied
                ? "Pro access required"
                : "We couldn't load this job"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
            {missing
              ? "The job may no longer be assigned to you, or its record is unavailable. Return to your jobs or check with your service provider."
              : denied
                ? "Your Pro session does not have access to this job. Sign in again or return to your assigned jobs."
                : "The job details could not be confirmed. Retry to load the saved workflow before taking action."}
          </p>
          <Button
            className="mt-6 min-h-11"
            variant="outline"
            onClick={retry}
            disabled={refreshing}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            {refreshing ? "Retrying…" : "Try again"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
export default function TechnicianJobDetail({
  session,
  jobId,
}: {
  session: Session | null;
  jobId: string;
}) {
  const query = useTechnicianJob(jobId),
    status = technicianRequestStatus(query.error);
  const unavailable = [401, 403, 404].includes(status || 0);
  const job = unavailable ? null : query.data?.job;
  useJobStatusConnection(job?._id, job?.bookingId?._id);
  if (query.isPending && !job)
    return <JobLoadState loading retry={() => void query.refetch()} />;
  if (!job)
    return (
      <JobLoadState
        status={status}
        refreshing={query.isFetching}
        retry={() => void query.refetch()}
      />
    );
  return (
    <WorkflowContent
      key={`${job._id}:${session?.user.id}`}
      data={{ ...query.data, job }}
      session={session}
      refresh={() => query.refetch()}
      refreshing={query.isFetching}
      refreshFailed={query.isError}
    />
  );
}

function WorkflowContent({
  data,
  session,
  refresh,
  refreshing,
  refreshFailed,
}: {
  data: TechnicianJobDetailResponse;
  session: Session | null;
  refresh: () => Promise<unknown>;
  refreshing: boolean;
  refreshFailed: boolean;
}) {
  const { job } = data,
    booking = job.bookingId,
    customer = booking?.customerId;
  const capabilities =
    refreshFailed && data.workflow
      ? {
          ...data.workflow,
          access: "read_only" as const,
          reason:
            "The latest job refresh failed. Refresh successfully before making another update.",
        }
      : data.workflow;
  const workflow = technicianWorkflow(job, capabilities),
    action = workflow.action;
  const [otp, setOtp] = useState(""),
    [proofNote, setProofNote] = useState(""),
    [proofFiles, setProofFiles] = useState<File[]>([]),
    [busy, setBusy] = useState<string | null>(null);
  const [gate] = useState(() => createTechnicianActionGate());
  const mounted = useRef(true),
    uploaded = useRef(new Map<File, { url: string; public_id: string }>());
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const accept = useAcceptTechnicianJob(),
    arrive = useArriveTechnicianJob(),
    start = useStartTechnicianJob(),
    proof = useUploadTechnicianProof(),
    complete = useCompleteTechnicianJob();
  const mutating = Boolean(
    busy ||
      accept.isPending ||
      arrive.isPending ||
      start.isPending ||
      proof.isPending ||
      complete.isPending,
  );
  const invoiceId = technicianInvoiceId(job);
  const proofs = (job.proofIds || []).filter(
    (item): item is Exclude<typeof item, string> =>
      typeof item === "object" && item !== null,
  );
  const bookedPrice =
    money(booking?.estimatedPrice) || money(booking?.pricing?.finalPrice);
  const schedule = dateLabel(job.scheduledAt || booking?.scheduledAt);
  const phone =
    typeof customer?.phone === "string" &&
    /^[+\d\s()-]{5,25}$/u.test(customer.phone)
      ? customer.phone.replace(/[\s()-]/gu, "")
      : null;
  const history = (
    [
      ["created", "Job created", job.createdAt],
      ["accepted", "Assignment accepted", job.acceptedAt],
      [
        "arrived",
        job.arrivalMethod === "automatic"
          ? "Arrival confirmed automatically"
          : "Arrival confirmed",
        job.arrivedAt,
      ],
      ["otp", "Customer OTP verified", job.customerOtpVerifiedAt],
      ["started", "Service work started", job.startTime],
      ["proof", "Latest proof saved", job.proofSubmittedAt],
      [
        "ended",
        job.status === "completed" ? "Service completed" : "Service ended",
        job.endTime,
      ],
      ["paid", "Payment recorded", job.paymentReceivedAt],
    ] as const
  )
    .filter((entry) => dateLabel(entry[2]))
    .sort((a, b) => new Date(a[2]!).getTime() - new Date(b[2]!).getTime());

  async function runAction(
    key: string,
    work: () => Promise<TechnicianMutationResponse | void>,
    success: string,
  ) {
    await gate.run(async () => {
      if (!workflow.active || !mounted.current) return;
      setBusy(key);
      try {
        const result = await work();
        if (!mounted.current) return;
        if (key === "start") setOtp("");
        if (key === "proof") {
          setProofFiles([]);
          setProofNote("");
          uploaded.current.clear();
        }
        toast.success(
          result?.invoice?.invoiceNumber
            ? `Invoice ${result.invoice.invoiceNumber} is ready.`
            : success,
        );
      } catch (error) {
        if (mounted.current) toast.error(technicianMutationMessage(error));
      } finally {
        if (mounted.current) setBusy(null);
      }
    });
  }
  function submitPrimary(event?: FormEvent) {
    event?.preventDefault();
    if (!action || mutating) return;
    if (action.key === "proof") {
      void submitProof();
      return;
    }
    if (action.key === "start" && otp.trim().length < 4) {
      toast.error("Enter the OTP provided by the customer.");
      return;
    }
    const execute =
      action.key === "accept"
        ? () => accept.mutateAsync(job._id)
        : action.key === "arrive"
          ? () => arrive.mutateAsync(job._id)
          : action.key === "start"
            ? () => start.mutateAsync({ id: job._id, otp: otp.trim() })
            : () => complete.mutateAsync(job._id);
    void runAction(
      action.key,
      execute,
      action.key === "accept"
        ? "Assignment accepted. Your saved status is En route."
        : action.key === "arrive"
          ? "Your arrival is confirmed. Ask the customer for their OTP."
          : action.key === "start"
            ? "Customer OTP verified. Service work has started."
            : action.key === "invoice"
              ? "Invoice operation confirmed."
              : "Service completion confirmed.",
    );
  }
  async function submitProof(event?: FormEvent) {
    event?.preventDefault();
    if (!workflow.canUploadProof || !proofFiles.length || mutating) return;
    await runAction(
      "proof",
      async () => {
        const files = await Promise.all(
          proofFiles.map(async (file) => {
            let item = uploaded.current.get(file);
            if (!item) {
              item = await uploadToCloudinary(file);
              uploaded.current.set(file, item);
            }
            return item;
          }),
        );
        if (!mounted.current) return;
        return proof.mutateAsync({
          id: job._id,
          payload: {
            proofNote: proofNote.trim(),
            proofs: files.map((file) => ({
              url: file.url,
              type: "photo",
              metadata: { public_id: file.public_id },
            })),
          },
        });
      },
      "Service proof saved.",
    );
  }
  function proofForm(primary = false) {
    return (
      <form
        onSubmit={submitProof}
        className="mt-5 space-y-4"
        aria-label="Service proof upload"
      >
        <div>
          <label
            htmlFor="service-proof-files"
            className="mb-2 block text-sm font-semibold"
          >
            Service photos
          </label>
          <Input
            id="service-proof-files"
            type="file"
            accept="image/*"
            multiple
            disabled={mutating}
            className="h-auto min-h-12 py-3"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (
                files.some(
                  (file) => !file.type.startsWith("image/") || file.size <= 0,
                )
              ) {
                toast.error("Choose valid image files for service proof.");
                event.target.value = "";
                return;
              }
              setProofFiles(files);
            }}
          />
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {proofFiles.length
              ? `${proofFiles.length} ${proofFiles.length === 1 ? "photo" : "photos"} selected.`
              : "Choose at least one clear photo. Photos are uploaded only when you submit."}
          </p>
        </div>
        <div>
          <label
            htmlFor="service-proof-note"
            className="mb-2 block text-sm font-semibold"
          >
            Proof note{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <Textarea
            id="service-proof-note"
            value={proofNote}
            onChange={(event) => setProofNote(event.target.value)}
            rows={3}
            maxLength={2000}
            disabled={mutating}
            placeholder="Describe the work shown in your photos"
          />
        </div>
        <Button
          type="submit"
          variant={primary ? "default" : "outline"}
          className="min-h-12 w-full sm:w-auto"
          disabled={mutating || !proofFiles.length}
        >
          {busy === "proof" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          {busy === "proof"
            ? "Uploading & saving proof…"
            : "Upload service proof"}
        </Button>
      </form>
    );
  }
  const statusTone =
    job.status === "completed"
      ? "border-brand-teal/25 bg-secondary text-secondary-foreground"
      : ["cancelled", "on_hold"].includes(job.status) ||
          (!workflow.active && job.status !== "completed")
        ? "border-primary/25 bg-primary/8 text-primary"
        : "border-border bg-muted text-foreground";
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-3">
        <BackLink />
        <Button
          variant="outline"
          className="min-h-11 shrink-0"
          onClick={() => void refresh()}
          disabled={refreshing || mutating}
          aria-label="Refresh job details"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
      <header className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Your service workspace
          </p>
          <h1 className="mt-2 break-words font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {booking?.serviceType || "Assigned service"}
          </h1>
          {booking?.subService && (
            <p className="mt-2 text-sm text-muted-foreground">
              {booking.subService}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="break-all">Job {job._id}</span>
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="Copy job reference"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(job._id);
                  toast.success("Job reference copied.");
                } catch {
                  toast.error(
                    "Copy is unavailable. Select the job reference to copy it.",
                  );
                }
              }}
            >
              <ClipboardCopy className="size-3.5" />
              Copy
            </button>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold",
            statusTone,
          )}
        >
          <span className="size-2 rounded-full bg-current" />
          {workflow.statusLabel}
        </span>
      </header>
      {refreshFailed && (
        <div
          role="alert"
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6"
        >
          The latest refresh failed. These are the last confirmed details;
          refresh successfully before updating this job.
        </div>
      )}
      <nav
        aria-label="Job progress"
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <ol className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
          {workflow.stages.map((stage, index) => (
            <li
              key={stage.key}
              aria-current={stage.state === "current" ? "step" : undefined}
              className="flex min-w-0 gap-3 sm:block"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold sm:mb-3",
                  stage.state === "completed"
                    ? "border-brand-teal/20 bg-secondary text-secondary-foreground"
                    : stage.state === "current"
                      ? "border-primary bg-primary text-primary-foreground"
                      : stage.state === "blocked" ||
                          stage.state === "exceptional"
                        ? "border-primary/20 bg-primary/5 text-primary"
                        : "border-border text-muted-foreground",
                )}
              >
                {stage.state === "completed" ? (
                  <Check className="size-4" />
                ) : stage.state === "blocked" ? (
                  <LockKeyhole className="size-4" />
                ) : stage.state === "exceptional" ? (
                  <TriangleAlert className="size-4" />
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{stage.label}</p>
                <p className="mt-1 hidden text-[11px] leading-5 text-muted-foreground sm:block">
                  {stage.detail}
                </p>
                <span className="sr-only">{stage.state}</span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
      <Card
        className={cn(
          "rounded-2xl border border-border shadow-none",
          action ? "border-primary/20" : "bg-muted/20",
        )}
      >
        <CardContent className="py-2 sm:py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
              {job.status === "completed" ? (
                <BadgeCheck className="size-5" />
              ) : action ? (
                <ArrowRight className="size-5" />
              ) : (
                <LockKeyhole className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {action
                  ? "Next step"
                  : job.status === "completed"
                    ? "Service complete"
                    : "Workflow update"}
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {action?.label ||
                  (job.status === "completed" && invoiceId
                    ? "The service workflow is complete"
                    : "No action is currently available")}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                {action?.description ||
                  workflow.blockedReason ||
                  "The saved job is completed. Its service history and recorded billing information remain available below."}
              </p>
              {job.status === "on_hold" && (
                <p className="mt-2 text-xs leading-6 text-primary">
                  The job is on hold. Only mark it complete once the agreed work
                  is finished.
                </p>
              )}
              {action?.key === "proof"
                ? proofForm(true)
                : action && (
                    <form
                      className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end"
                      onSubmit={submitPrimary}
                    >
                      {action.key === "start" && (
                        <div className="w-full sm:max-w-xs">
                          <label
                            htmlFor="customer-job-otp"
                            className="mb-2 block text-sm font-semibold"
                          >
                            Customer OTP
                          </label>
                          <Input
                            id="customer-job-otp"
                            name="otp"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            minLength={4}
                            maxLength={12}
                            value={otp}
                            onChange={(event) => setOtp(event.target.value)}
                            placeholder="Enter the customer's OTP"
                            className="h-12"
                            disabled={mutating}
                            required
                          />
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="min-h-12 w-full whitespace-normal text-left sm:w-auto"
                        disabled={
                          mutating ||
                          (action.key === "start" && otp.trim().length < 4)
                        }
                      >
                        {mutating ? (
                          <Loader2 className="size-4 shrink-0 animate-spin" />
                        ) : action.key === "start" ? (
                          <ShieldCheck className="size-4 shrink-0" />
                        ) : (
                          <ArrowRight className="size-4 shrink-0" />
                        )}
                        {mutating ? action.busyLabel : action.label}
                      </Button>
                    </form>
                  )}
            </div>
          </div>
        </CardContent>
      </Card>
      {job.status === "enroute" && (
        <ProJourney
          jobId={job._id}
          status={job.status}
          journey={data.journey}
        />
      )}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="min-w-0 space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                Service destination
              </CardTitle>
              <CardDescription>
                Navigate to the confirmed booking address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServiceAddressPreview address={booking?.address} navigate />
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Booking details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <DetailRow label="Booking reference" value={booking?._id} />
                <DetailRow
                  label="Scheduled visit"
                  value={schedule || "Schedule not recorded"}
                />
                <DetailRow
                  label="Booking status"
                  value={booking?.status?.replaceAll("_", " ")}
                />
                {booking?.timeWindow && (
                  <DetailRow
                    label="Preferred time window"
                    value={[
                      dateLabel(booking.timeWindow.from),
                      dateLabel(booking.timeWindow.to),
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                  />
                )}
              </dl>
              {(booking?.notes || job.notes) && (
                <div className="mt-6 space-y-4 border-t border-border pt-5">
                  {booking?.notes && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground">
                        Customer / booking instructions
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                        {booking.notes}
                      </p>
                    </div>
                  )}
                  {job.notes && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground">
                        Job notes
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                        {job.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-5 text-primary" />
                Service proof
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {workflow.proofCount} saved
                </span>
              </CardTitle>
              <CardDescription>
                {job.proofRequired === true
                  ? "Proof is required before this job can be completed."
                  : job.proofRequired === false
                    ? "Proof is optional for this job."
                    : "Refresh the job to confirm its proof requirement."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proofs.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {proofs.map((item) => {
                    const url = safeProofUrl(item.url),
                      preview = safeProofUrl(item.thumbnailUrl) || url;
                    return (
                      <article
                        key={item._id}
                        className="overflow-hidden rounded-xl border border-border"
                      >
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            {preview && item.type !== "video" ? (
                              <Image
                                src={preview}
                                alt="Saved service proof"
                                width={480}
                                height={300}
                                unoptimized
                                className="h-40 w-full object-cover"
                              />
                            ) : (
                              <span className="flex min-h-24 items-center justify-center text-sm font-semibold">
                                Open saved proof
                                <ArrowRight className="ml-2 size-4" />
                              </span>
                            )}
                          </a>
                        )}
                        <div className="p-3">
                          <p className="text-xs font-semibold">
                            {item.type
                              ? item.type.replaceAll("_", " ")
                              : "Saved proof"}
                          </p>
                          {dateLabel(item.createdAt) && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {dateLabel(item.createdAt)}
                            </p>
                          )}
                          {item.metadata?.note && (
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-6">
                              {item.metadata.note}
                            </p>
                          )}
                          {!url && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Preview unavailable. The proof record remains
                              saved.
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-5 text-sm leading-7 text-muted-foreground">
                  {workflow.proofCount
                    ? `${workflow.proofCount} proof records are saved; previews are unavailable. Refresh to try loading them again.`
                    : "No service proof has been saved yet."}
                </p>
              )}
              {workflow.canUploadProof && action?.key !== "proof" && (
                <details className="mt-5 rounded-xl border border-border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Add service photos
                  </summary>
                  {proofForm()}
                </details>
              )}
            </CardContent>
          </Card>
          <JobPartsUsed
            key={`${job._id}:${JSON.stringify(job.partsUsed || [])}`}
            jobId={job._id}
            partsUsed={job.partsUsed || []}
            jobStatus={job.status}
            readOnly={!workflow.canManageParts || mutating}
            actionGate={gate}
            onBusyChange={(value) => setBusy(value ? "parts" : null)}
          />
        </div>
        <aside className="min-w-0 space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5 text-primary" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="break-words text-base font-semibold">
                {customer?.name || "Customer details unavailable"}
              </p>
              {customer?.phone && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {customer.phone}
                </p>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
                >
                  <Phone className="size-4" />
                  Call customer
                </a>
              )}
              {session?.user?.id && session.user.role === "technician" && (
                <div className="mt-3 [&_button]:min-h-11 [&_button]:w-full">
                  <JobChatPanel
                    jobId={job._id}
                    currentUserId={session.user.id}
                    currentUserRole="technician"
                    currentUserName={session.user.name || undefined}
                    triggerLabel="Open job chat"
                  />
                </div>
              )}
              <p className="mt-4 text-xs leading-6 text-muted-foreground">
                Contact and messages are available only through your authorized
                job.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                Billing record
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-5">
                <DetailRow
                  label={
                    money(booking?.estimatedPrice)
                      ? "Estimated service price"
                      : "Booked service price"
                  }
                  value={bookedPrice}
                />
                <DetailRow
                  label="Payment status"
                  value={job.paymentStatus?.replaceAll("_", " ")}
                />
                <DetailRow
                  label="Invoice reference"
                  value={
                    (typeof job.invoiceId === "object" &&
                      job.invoiceId?.invoiceNumber) ||
                    invoiceId
                  }
                />
                <DetailRow
                  label="Payment recorded"
                  value={dateLabel(job.paymentReceivedAt)}
                />
                <DetailRow
                  label="Recorded payment method"
                  value={job.paymentMethod}
                />
              </dl>
              {!bookedPrice && !job.paymentStatus && !invoiceId && (
                <p className="text-sm leading-7 text-muted-foreground">
                  No billing details are recorded in this job yet.
                </p>
              )}
              <p className="mt-5 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
                The invoice is generated through the existing completion
                workflow. Recorded parts are included by the billing service.
              </p>
            </CardContent>
          </Card>
          {invoiceId && job.status === "completed" && <FinalBillPanel invoiceId={invoiceId}/>}
          {booking?._id && <CancellationPanel bookingId={booking._id}/>}
          {history.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="size-5 text-primary" />
                  Recorded history
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-5">
                  {history.map(([key, label, value]) => (
                    <li key={key} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal-dark" />
                      <div>
                        <p className="text-xs font-semibold">{label}</p>
                        <time
                          dateTime={value}
                          className="mt-1 block text-[11px] leading-5 text-muted-foreground"
                        >
                          {dateLabel(value)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
