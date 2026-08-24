"use client";

import Link from "next/link";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  IndianRupee,
  MapPin,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


function currency(amount:number){
    return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(amount || 0);
};

function formatDate(
  value?: string | Date
) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(
  value?: string | Date
) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  subtle,
}: {
  label: string;
  value: string | number;
  icon: any;
  href?: string;
  subtle?: string;
}) {
  const content = (
    <Card className="rounded-2xl border-border/70 transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">

        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-sm text-muted-foreground">
              {label}
            </p>

            <div className="mt-2 text-2xl font-semibold tracking-tight">
              {value}
            </div>

            {subtle && (
              <p className="mt-1 text-xs text-muted-foreground">
                {subtle}
              </p>
            )}
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>

        </div>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}

export default function ServiceProviderDashboard(){

    const {data,isLoading,isError} = useProviderDashboard();

    if (isLoading) {
    return (
      <div className="space-y-6">

        <div className="h-32 animate-pulse rounded-3xl bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>

      </div>
    );
  };

  if (isError || !data) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">
            Unable to load dashboard
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh the page and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    provider,
    stats,
    recentBookings,
    activeJobsList,
    recentInvoices,
    revenueTrend
  } = data;

  const maxRevenue = Math.max(
     ...revenueTrend.map(
      (item: any) =>
        Number(item.revenue || 0)
    ),
    1
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className="rounded-3xl border border-border/70 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm sm:p-8">

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5" />

              {provider.status === "active"
                ? "Business active"
                : "Business inactive"}
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back
            </h1>

            <p className="mt-2 text-lg text-slate-300">
              {provider.companyName}
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Manage your bookings, technicians,
              services, payments, and daily operations
              from one place.
            </p>

          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">

            {provider.trial?.daysRemaining !== null &&
              provider.trial?.daysRemaining !== undefined && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs text-slate-400">
                    Free trial
                  </p>

                  <p className="mt-1 font-semibold">
                    {provider.trial.daysRemaining} days left
                  </p>
                </div>
              )}

            <Button
              asChild
              className="rounded-xl bg-white text-slate-950 hover:bg-slate-100"
            >
              <Link
                href="/service-provider/services"
              >
                Manage Services
                <ArrowRight className="ml-2 h-4 w-4 inline" />
              </Link>
            </Button>

          </div>

        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Booking Requests"
          value={
            stats.pendingBookingRequests
          }
          subtle="Needs your attention"
          icon={CalendarClock}
          href="/service-provider/booking-requests"
        />

        <StatCard
          label="Active Jobs"
          value={stats.activeJobs}
          subtle={`${stats.confirmedBookings} confirmed bookings`}
          icon={BriefcaseBusiness}
          href="/service-provider/assigned-jobs"
        />

        <StatCard
          label="Technicians"
          value={`${stats.availableTechnicians}/${stats.technicians}`}
          subtle="Available now"
          icon={Users}
          href="/service-provider/technicians"
        />

        <StatCard
          label="Revenue"
          value={currency(stats.revenue)}
          subtle={`${stats.completedJobs} jobs completed`}
          icon={IndianRupee}
          href="/service-provider/invoices"
        />

      </div>

      {/* Main operations */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">

        {/* Booking Requests */}
        <Card className="rounded-2xl border-border/70">

          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-lg">
                Booking requests
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Requests waiting for your action.
              </p>
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl"
            >
              <Link href="/service-provider/booking-requests">
                View all
                <ChevronRight className="ml-1 h-4 w-4 inline" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">

            {recentBookings.filter(
              (booking: any) =>
                booking.status === "pending"
            ).length === 0 ? (
              <div className="p-10 text-center">

                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />

                <h3 className="mt-3 font-medium">
                  No pending requests
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  You're all caught up.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-border">

                {recentBookings
                  .filter(
                    (booking: any) =>
                      booking.status === "pending"
                  )
                  .slice(0, 5)
                  .map(
                    (booking: any) => (
                      <div
                        key={booking._id}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div>
                          <div className="flex flex-wrap items-center gap-2">

                            <p className="font-medium">
                              {booking
                                .serviceOfferingId
                                ?.name ||
                                booking.serviceType ||
                                "Service"}
                            </p>

                            <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                              New request
                            </Badge>

                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {booking
                              .customerId
                              ?.name ||
                              "Customer"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">

                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {booking.address?.city ||
                                "Location"}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(
                                booking.scheduledAt
                              )}
                            </span>

                          </div>
                        </div>

                        <Button
                          asChild
                          size="sm"
                          className="rounded-xl"
                        >
                          <Link
                            href={`/service-provider/booking-requests/${booking._id}`}
                          >
                            Review
                          </Link>
                        </Button>

                      </div>
                    )
                  )}

              </div>
            )}

          </CardContent>
        </Card>

        {/* Technician status */}
        <Card className="rounded-2xl border-border/70">

          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-lg">
                Technician status
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Your active field team.
              </p>
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl"
            >
              <Link
                href="/service-provider/technicians"
              >
                Manage
                <ChevronRight className="ml-1 h-4 w-4 inline" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-5">

            <div className="grid grid-cols-3 gap-3">

              <div className="rounded-2xl bg-muted/50 p-4 text-center">
                <div className="text-xl font-semibold">
                  {stats.technicians}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Total
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                <div className="text-xl font-semibold text-emerald-700">
                  {stats.availableTechnicians}
                </div>

                <div className="mt-1 text-xs text-emerald-700/70">
                  Available
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 text-center">
                <div className="text-xl font-semibold text-amber-700">
                  {Math.max(
                    0,
                    stats.technicians -
                      stats.availableTechnicians
                  )}
                </div>

                <div className="mt-1 text-xs text-amber-700/70">
                  Other
                </div>
              </div>

            </div>

            <div className="mt-5 space-y-3">

              {activeJobsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No active technician jobs.
                </div>
              ) : (
                activeJobsList
                  .slice(0, 4)
                  .map((job: any) => (
                    <div
                      key={job._id}
                      className="flex items-center justify-between rounded-2xl border p-3"
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {job.technicianId
                            ?.userId
                            ?.name
                            ?.slice(0, 1)
                            ?.toUpperCase() ||
                            "T"}
                        </div>

                        <div>
                          <div className="text-sm font-medium">
                            {job
                              .technicianId
                              ?.userId
                              ?.name ||
                              "Technician"}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {job.status}
                          </div>
                        </div>

                      </div>

                      <Badge variant="secondary">
                        {job.bookingId
                          ?.serviceType ||
                          "Job"}
                      </Badge>

                    </div>
                  ))
              )}

            </div>

          </CardContent>
        </Card>

      </div>

      {/* Revenue + jobs */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Revenue */}
        <Card className="rounded-2xl border-border/70">

          <CardHeader>
            <CardTitle className="text-lg">
              Revenue — last 7 days
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Collected amount based on recorded invoice payments.
            </p>
          </CardHeader>

          <CardContent>

            <div className="flex h-56 items-end gap-3">

              {revenueTrend.map(
                (item: any) => {
                  const value =
                    Number(
                      item.revenue || 0
                    );

                  const height =
                    Math.max(
                      8,
                      (value /
                        maxRevenue) *
                        100
                    );

                  const date =
                    new Date(
                      item._id
                    );

                  return (
                    <div
                      key={item._id}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >

                      <div className="text-[10px] text-muted-foreground">
                        {value > 0
                          ? currency(
                              value
                            )
                          : ""}
                      </div>

                      <div
                        className="w-full max-w-10 rounded-t-lg bg-slate-900 transition-all"
                        style={{
                          height: `${height}%`,
                        }}
                        title={currency(
                          value
                        )}
                      />

                      <div className="text-[10px] text-muted-foreground">
                        {date.toLocaleDateString(
                          "en-IN",
                          {
                            weekday: "short",
                          }
                        )}
                      </div>

                    </div>
                  );
                }
              )}

            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="rounded-2xl border-border/70">

          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Recent invoices
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Latest billing activity.
              </p>
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl"
            >
              <Link
                href="/service-provider/invoices"
              >
                View all
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">

            {recentInvoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No invoices yet.
              </div>
            ) : (
              recentInvoices
                .map((invoice: any) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between rounded-2xl border p-4"
                  >

                    <div>
                      <div className="font-medium">
                        {invoice.invoiceNumber}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(
                          invoice.createdAt
                        )}
                      </div>
                    </div>

                    <div className="text-right">

                      <div className="font-semibold">
                        {currency(
                          invoice.amountPaid || 0
                        )}
                      </div>

                      <Badge
                        variant="secondary"
                        className="mt-1 rounded-full"
                      >
                        {invoice.status}
                      </Badge>

                    </div>

                  </div>
                ))
            )}

          </CardContent>
        </Card>

      </div>

      {/* Quick actions */}
      <Card className="rounded-2xl border-border/70">

        <CardHeader>
          <CardTitle className="text-lg">
            Quick actions
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <Button
            asChild
            variant="outline"
            className="h-auto justify-start rounded-2xl p-4"
          >
            <Link
              href="/service-provider/services"
            >
              <Wrench className="mr-3 h-4 w-4 " />

              <span className="text-left">
                <span className="block font-medium">
                  Manage Services
                </span>

                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Pricing & offers
                </span>
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto justify-start rounded-2xl p-4"
          >
            <Link
              href="/service-provider/technicians"
            >
              <Users className="mr-3 h-4 w-4" />

              <span className="text-left">
                <span className="block font-medium">
                  Add Technician
                </span>

                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Grow your field team
                </span>
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto justify-start rounded-2xl p-4"
          >
            <Link
              href="/service-provider/service-areas"
            >
              <MapPin className="mr-3 h-4 w-4" />

              <span className="text-left">
                <span className="block font-medium">
                  Service Areas
                </span>

                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Where you operate
                </span>
              </span>
            </Link>
          </Button>

          <Button
            asChild
            className="h-auto justify-start rounded-2xl p-4"
          >
            <Link
              href="/service-provider/booking-requests"
            >
              <Plus className="mr-3 h-4 w-4" />

              <span className="text-left">
                <span className="block font-medium">
                  Booking Requests
                </span>

                <span className="mt-0.5 block text-xs opacity-80">
                  Review new work
                </span>
              </span>
            </Link>
          </Button>

        </CardContent>
      </Card>
    </div>
  );

}