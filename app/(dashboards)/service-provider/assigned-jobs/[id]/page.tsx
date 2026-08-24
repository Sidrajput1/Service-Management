"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileImage,
  FileText,
  IndianRupee,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

import {
  useProviderAssignedJob,
} from "@/hooks/useProviderAssignedJobs";

import {
  Card,
  CardContent,
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
  Separator,
} from "@/components/ui/separator";

function currency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(value || 0);
}

function formatDateTime(
  value?: string | Date,
) {
  if (!value) return null;

  return new Date(
    value,
  ).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function getJobStatusLabel(
  status?: string,
) {
  switch (status) {
    case "assigned":
      return "Assigned";

    case "enroute":
      return "Technician on the way";

    case "arrived":
      return "Technician arrived";

    case "otp_verified":
      return "Customer verified";

    case "in_progress":
      return "Service in progress";

    case "on_hold":
      return "Service on hold";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status || "Unknown";
  }
}

function getJobStatusClass(
  status?: string,
) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

    case "in_progress":
      return "bg-blue-50 text-blue-700 hover:bg-blue-50";

    case "enroute":
      return "bg-indigo-50 text-indigo-700 hover:bg-indigo-50";

    case "arrived":
      return "bg-amber-50 text-amber-700 hover:bg-amber-50";

    case "otp_verified":
      return "bg-violet-50 text-violet-700 hover:bg-violet-50";

    case "on_hold":
      return "bg-orange-50 text-orange-700 hover:bg-orange-50";

    case "cancelled":
      return "bg-rose-50 text-rose-700 hover:bg-rose-50";

    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ProviderAssignedJobDetailPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = String(
    params.id,
  );

  const {
    data,
    isLoading,
    isError,
  } = useProviderAssignedJob(
    jobId,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />

        <div className="h-40 animate-pulse rounded-3xl bg-muted" />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-150 animate-pulse rounded-2xl bg-muted" />
          <div className="h-150 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (
    isError ||
    !data?.job
  ) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">
            Assigned job not found
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            This job may have been removed or you may
            not have access to it.
          </p>

          <Button
            asChild
            className="mt-5 rounded-xl"
          >
            <Link href="/service-provider/assigned-jobs">
              Back to Assigned Jobs
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const {
    job,
    booking,
    customer,
    service,
    technician,
    invoice,
    proofs,
    timeline,
  } = data;

  const finalPrice =
    Number(
      booking?.pricing?.finalPrice ||
      booking?.estimatedPrice ||
      0,
    );

  return (
    <div className="space-y-6">

      {/* Back */}
      <Button
        variant="ghost"
        onClick={() =>
          router.push(
            "/service-provider/assigned-jobs",
          )
        }
        className="-ml-3 rounded-xl"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Assigned Jobs
      </Button>

      {/* Header */}
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <div className="flex flex-wrap items-center gap-2">

              <Badge
                className={`rounded-full ${getJobStatusClass(
                  job.status,
                )}`}
              >
                {getJobStatusLabel(
                  job.status,
                )}
              </Badge>

              {job.proofIds?.length > 0 && (
                <Badge className="gap-1 rounded-full bg-white/10 text-white hover:bg-white/10">
                  <FileImage className="h-3 w-3" />
                  {job.proofIds.length} proof
                  {job.proofIds.length > 1
                    ? "s"
                    : ""}
                </Badge>
              )}

            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              {service?.name ||
                booking?.serviceType ||
                "Service Job"}
            </h1>

            <p className="mt-2 text-slate-300">
              Job #{String(job._id).slice(-8)}
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Monitor technician execution, customer
              service progress, proof, billing, and payment
              from this job.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 lg:min-w-47.5">

            <p className="text-xs text-slate-400">
              Booking value
            </p>

            <p className="mt-1 text-2xl font-semibold">
              {currency(finalPrice)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Payment:{" "}
              {job.paymentStatus ||
                "unbilled"}
            </p>

          </div>

        </div>

      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

        {/* LEFT */}
        <div className="space-y-6">

          {/* Execution timeline */}
          <Card className="rounded-2xl border-border/70">

            <CardHeader>
              <CardTitle>
                Execution timeline
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Live operational progress of the assigned job.
              </p>
            </CardHeader>

            <CardContent>

              <div className="relative">

                {timeline?.map(
                  (
                    item: any,
                    index: number,
                  ) => {

                    const isLast =
                      index ===
                      timeline.length - 1;

                    return (
                      <div
                        key={item.key}
                        className="relative flex gap-4 pb-8 last:pb-0"
                      >

                        {!isLast && (
                          <div
                            className={`absolute left-3.75 top-8 h-[calc(100%-16px)] w-px ${
                              item.completed
                                ? "bg-slate-950"
                                : "bg-border"
                            }`}
                          />
                        )}

                        <div
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                            item.completed
                              ? "border-slate-950 bg-slate-950 text-white"
                              : item.current
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {item.completed ? (
                            <Check className="h-4 w-4" />
                          ) : item.current ? (
                            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-current" />
                          )}
                        </div>

                        <div className="min-w-0 pt-0.5">

                          <div className="flex flex-wrap items-center gap-2">

                            <p
                              className={`text-sm font-medium ${
                                item.current
                                  ? "text-blue-700"
                                  : item.completed
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {item.title}
                            </p>

                            {item.current && (
                              <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
                                Current
                              </Badge>
                            )}

                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                          </p>

                          {item.timestamp && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateTime(
                                item.timestamp,
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}

              </div>

            </CardContent>
          </Card>

          {/* Customer */}
          <Card className="rounded-2xl border-border/70">

            <CardHeader>
              <CardTitle>
                Customer
              </CardTitle>
            </CardHeader>

            <CardContent>

              <div className="flex items-start justify-between gap-4">

                <div className="flex gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                    {(
                      customer?.name ||
                      "C"
                    )
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div>
                    <p className="font-semibold">
                      {customer?.name ||
                        "Customer"}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {customer?.phone ||
                        "Phone unavailable"}
                    </p>

                    {customer?.email && (
                      <p className="text-sm text-muted-foreground">
                        {customer.email}
                      </p>
                    )}
                  </div>

                </div>

                {customer?.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </Button>
                )}

              </div>

              <Separator className="my-5" />

              <div className="flex gap-3">

                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">
                    Service address
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking?.address
                      ?.addressLine ||
                      "Address unavailable"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {booking?.address?.city ||
                      ""}
                    {booking?.address?.pincode
                      ? `, ${booking.address.pincode}`
                      : ""}
                  </p>
                </div>

              </div>

            </CardContent>
          </Card>

          {/* Service */}
          <Card className="rounded-2xl border-border/70">

            <CardHeader>
              <CardTitle>
                Service details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">

              <div className="flex gap-4">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Wrench className="h-4 w-4" />
                </div>

                <div>
                  <p className="font-medium">
                    {service?.name ||
                      booking?.serviceType}
                  </p>

                  {service?.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                </div>

              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">

                <InfoItem
                  icon={CalendarClock}
                  label="Scheduled"
                  value={
                    booking?.scheduledAt
                      ? formatDateTime(
                          booking.scheduledAt,
                        )
                      : "Flexible"
                  }
                />

                <InfoItem
                  icon={MapPin}
                  label="Location"
                  value={
                    booking?.address?.city ||
                    "—"
                  }
                />

              </div>

            </CardContent>
          </Card>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* Technician */}
          <Card className="rounded-2xl border-border/70">

            <CardHeader>
              <CardTitle>
                Assigned technician
              </CardTitle>
            </CardHeader>

            <CardContent>

              {!technician ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">

                  <UserRound className="mx-auto h-7 w-7 text-muted-foreground" />

                  <p className="mt-3 font-medium">
                    No technician assigned
                  </p>

                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                      {(
                        technician.userId?.name ||
                        "T"
                      )
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">

                      <p className="font-semibold">
                        {technician.userId?.name ||
                          "Technician"}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {technician.userId?.phone ||
                          "Phone unavailable"}
                      </p>

                      <Badge
                        className={`mt-2 rounded-full ${
                          technician.status ===
                          "busy"
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {technician.status}
                      </Badge>

                    </div>
                  </div>

                  {technician.skills?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">

                      {technician.skills.map(
                        (skill: string) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="rounded-full"
                          >
                            {skill}
                          </Badge>
                        ),
                      )}

                    </div>
                  )}

                  <Separator className="my-5" />

                  <div className="rounded-2xl bg-muted/40 p-4">

                    <p className="text-xs text-muted-foreground">
                      Technician status
                    </p>

                    <p className="mt-1 font-medium">
                      {getJobStatusLabel(
                        job.status,
                      )}
                    </p>

                  </div>
                </>
              )}

            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="rounded-2xl border-border/70">

            <CardHeader>
              <CardTitle>
                Billing summary
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Service price
                </span>

                <span>
                  {currency(
                    booking?.pricing
                      ?.basePrice ||
                      0,
                  )}
                </span>
              </div>

              {booking?.pricing
                ?.discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount
                  </span>

                  <span className="text-emerald-600">
                    -
                    {currency(
                      booking.pricing.discountAmount,
                    )}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Booking value
                </span>

                <span className="text-xl font-semibold">
                  {currency(finalPrice)}
                </span>
              </div>

              {booking?.pricing?.offerName && (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Offer applied:{" "}
                  <strong>
                    {booking.pricing.offerName}
                  </strong>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Proof */}
          <Card className="rounded-2xl border-border/70">

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Service proof
              </CardTitle>
            </CardHeader>

            <CardContent>

              {proofs?.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">

                  <FileImage className="mx-auto h-7 w-7 text-muted-foreground" />

                  <p className="mt-3 font-medium">
                    No proof uploaded yet
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Proof will appear here after the technician uploads it.
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {proofs.map(
                    (proof: any) => (
                      <div
                        key={proof._id}
                        className="flex items-center justify-between rounded-2xl border p-3"
                      >

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                            <FileImage className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="text-sm font-medium">
                              {proof.title ||
                                "Service proof"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(
                                proof.createdAt,
                              )}
                            </p>
                          </div>

                        </div>

                        {proof.url && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                          >
                            <a
                              href={proof.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                          </Button>
                        )}

                      </div>
                    ),
                  )}

                </div>
              )}

            </CardContent>
          </Card>

          {/* Invoice / payment */}
          <Card className="rounded-2xl border-border/70">

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Payment & Invoice
              </CardTitle>
            </CardHeader>

            <CardContent>

              {!invoice ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">

                  <FileText className="mx-auto h-7 w-7 text-muted-foreground" />

                  <p className="mt-3 font-medium">
                    Invoice not generated yet
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    The invoice will appear after the job is completed.
                  </p>

                </div>
              ) : (
                <div className="space-y-4">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Invoice
                      </p>

                      <p className="mt-1 font-medium">
                        {invoice.invoiceNumber}
                      </p>
                    </div>

                    <Badge
                      className={`rounded-full ${
                        invoice.status ===
                        "paid"
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      {invoice.status}
                    </Badge>

                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total
                    </span>

                    <span className="font-semibold">
                      {currency(
                        invoice.grandTotal,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Paid
                    </span>

                    <span className="font-medium text-emerald-600">
                      {currency(
                        invoice.amountPaid,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Balance
                    </span>

                    <span className="font-medium">
                      {currency(
                        invoice.balanceDue,
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">

                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-xl"
                    >
                      <Link
                        href={`/service-provider/invoices/${invoice._id}`}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Invoice
                      </Link>
                    </Button>

                  </div>

                </div>
              )}

            </CardContent>
          </Card>

        </div>

      </div>

      {/* Booking link */}
      {booking?._id && (
        <div className="flex justify-center">
          <Button
            asChild
            variant="ghost"
            className="rounded-xl"
          >
            <Link
              href={`/service-provider/bookings/${booking._id}`}
            >
              View Booking Details
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium">
          {value}
        </p>
      </div>

    </div>
  );
}