"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import { useNewCustomerBooking } from "@/hooks/useCustomerBookings";
import BookingReviewCard from "@/components/customer/BookingReviewCard";

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | Date) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | Date) {
  if (!value) return null;

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(key?: string) {
  switch (key) {
    case "request_sent":
      return "Request sent";

    case "provider_accepted":
      return "Provider accepted";

    case "technician_assigned":
      return "Technician assigned";

    case "technician_enroute":
      return "Technician is on the way";

    case "technician_arrived":
      return "Technician arrived";

    case "service_verified":
      return "Service verified";

    case "service_in_progress":
      return "Service in progress";

    case "service_on_hold":
      return "Service temporarily paused";

    case "completed":
      return "Service completed";

    case "cancelled":
      return "Booking cancelled";

    default:
      return "Service update";
  }
}

export default function CustomerBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [otpCopied, setOtpCopied] = useState(false);

  const bookingId = String(params.id);

  const { data, isLoading, isError } = useNewCustomerBooking(bookingId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />

        <div className="h-44 animate-pulse rounded-3xl bg-muted" />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-125 animate-pulse rounded-2xl bg-muted" />
          <div className="h-125 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !data?.booking) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">Booking not found</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't load this booking.
          </p>

          <Button asChild className="mt-5 rounded-xl">
            <Link href="/customer/bookings">Back to My Bookings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const {
    booking,
    provider,
    service,
    technician,
    job,
    invoice,
    tracking,
    timeline,
  } = data;

  const finalPrice = Number(
    booking.pricing?.finalPrice || booking.estimatedPrice || 0,
  );
  const otp = job?.otp !== undefined && job?.otp !== null
    ? String(job.otp).trim()
    : "";

  const hasPaymentDue =
    invoice &&
    Number(invoice.balanceDue || 0) > 0 &&
    invoice.status !== "cancelled";

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        onClick={() => router.push("/customer/bookings")}
        className="-ml-3 rounded-xl"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        My Bookings
      </Button>

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
                {getStatusLabel(tracking?.key)}
              </Badge>

              {provider?.verificationStatus === "verified" && (
                <Badge className="gap-1 rounded-full bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/10">
                  <ShieldCheck className="h-3 w-3" />
                  Verified provider
                </Badge>
              )}
             
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {service?.name || booking.serviceType}
            </h1>

            <p className="mt-2 text-slate-300">
              {provider?.companyName || "Service Provider"}
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              {tracking?.description}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 lg:min-w-45">
            <p className="text-xs text-slate-400">Service amount</p>

            <p className="mt-1 text-2xl font-semibold">
              {currency(finalPrice)}
            </p>


            {booking.pricing?.discountAmount > 0 && (
              <p className="mt-1 text-xs text-emerald-300">
                You saved {currency(booking.pricing.discountAmount)}
              </p>
            )}
          </div>
           <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:min-w-64">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Service OTP
                </p>
                {otp ? (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-bold tracking-[0.3em] text-white">
                      {otp}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        void navigator.clipboard.writeText(otp);
                        setOtpCopied(true);
                        window.setTimeout(() => setOtpCopied(false), 1500);
                      }}
                    >
                      {otpCopied ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {otpCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-300">
                    No OTP generated yet.
                  </p>
                )}
              </div>
          
        </div>
      </section>

      {/* Progress */}
      {tracking?.key !== "cancelled" && (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Service progress
                </p>

                <p className="mt-1 font-semibold">{tracking?.label}</p>
              </div>

              <span className="text-sm font-medium text-muted-foreground">
                {Math.round(((tracking?.progress || 0) / 8) * 100)}%
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-slate-950 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((tracking?.progress || 0) / 8) * 100,
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5" />
                Service timeline
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Follow your service from request to completion.
              </p>
            </CardHeader>

            <CardContent>
              <div className="relative">
                {timeline?.map((item: any, index: number) => {
                  const isLast = index === timeline.length - 1;

                  return (
                    <div
                      key={item.key}
                      className="relative flex gap-4 pb-8 last:pb-0"
                    >
                      {!isLast && (
                        <div
                          className={`absolute left-3.75 top-8 h-[calc(100%-16px)] w-px ${
                            item.completed ? "bg-slate-950" : "bg-border"
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
                            {formatDateTime(item.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Service + address */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle>Service details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Wrench className="h-4 w-4" />
                </div>

                <div>
                  <p className="font-medium">
                    {service?.name || booking.serviceType}
                  </p>

                  {service?.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <CalendarClock className="h-4 w-4" />
                </div>

                <div>
                  <p className="font-medium">Scheduled service</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.scheduledAt
                      ? new Date(booking.scheduledAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Schedule to be confirmed"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <MapPin className="h-4 w-4" />
                </div>

                <div>
                  <p className="font-medium">Service address</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.address?.addressLine || "Address unavailable"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {booking.address?.city || ""}
                    {booking.address?.pincode
                      ? `, ${booking.address.pincode}`
                      : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Provider */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle>Service provider</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Wrench className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold">{provider?.companyName}</p>

                  {provider?.businessType && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {provider.businessType}
                    </p>
                  )}

                  {provider?.verificationStatus === "verified" && (
                    <Badge className="mt-2 gap-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technician */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle>Your technician</CardTitle>
            </CardHeader>

            <CardContent>
              {!technician ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <UserRound className="mx-auto h-7 w-7 text-muted-foreground" />

                  <p className="mt-3 font-medium">
                    Technician not assigned yet
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll notify you as soon as a technician is assigned.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                      {(technician.userId?.name || "T")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold">
                        {technician.userId?.name || "Technician"}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {technician.userId?.phone || "Contact unavailable"}
                      </p>

                      <Badge
                        className={`mt-2 rounded-full ${
                          technician.status === "busy"
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {technician.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-xl" disabled>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </Button>

                    <Button variant="outline" className="rounded-xl" disabled>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Service amount
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {currency(finalPrice)}
                  </p>
                </div>

                {invoice && (
                  <Badge
                    className={`rounded-full ${
                      invoice.status === "paid"
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    {invoice.status}
                  </Badge>
                )}
              </div>

              {invoice && (
                <>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Invoice</p>

                      <p className="mt-1 font-medium">
                        {invoice.invoiceNumber || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Amount due</p>

                      <p className="mt-1 font-medium">
                        {currency(invoice.balanceDue || 0)}
                      </p>
                    </div>
                  </div>

                  {hasPaymentDue && (
                    <Button asChild className="w-full rounded-xl">
                      <Link href={`/customer/payments/${invoice._id}`}>
                        Pay Now
                      </Link>
                    </Button>
                  )}

                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    <Link href={`/customer/invoice/${invoice._id}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      View Invoice
                    </Link>
                  </Button>
                </>
              )}

              {!invoice && (
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Your invoice will appear here once billing is generated.
                </div>
              )}
            </CardContent>
          </Card>

          {job?.status === "completed" && (
            <BookingReviewCard bookingId={booking._id} jobStatus={job.status} />
          )}
        </div>
      </div>
    </div>
  );
}
