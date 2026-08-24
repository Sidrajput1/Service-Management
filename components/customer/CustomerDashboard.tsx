"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  Search,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";



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
  Input,
} from "@/components/ui/input";
import { useCustomerDashboard } from "@/hooks/useCustomer";

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function currency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(value || 0);
}

function bookingStatusLabel(
  status?: string,
) {
  switch (status) {
    case "pending":
      return "Request pending";

    case "confirmed":
      return "Provider accepted";

    case "assigned":
      return "Technician assigned";

    case "cancelled":
      return "Cancelled";

    case "rescheduled":
      return "Rescheduled";

    default:
      return status || "Unknown";
  }
}

function bookingStatusClass(
  status?: string,
) {
  switch (status) {
    case "confirmed":
      return "bg-blue-50 text-blue-700 hover:bg-blue-50";

    case "assigned":
      return "bg-violet-50 text-violet-700 hover:bg-violet-50";

    case "pending":
      return "bg-amber-50 text-amber-700 hover:bg-amber-50";

    case "cancelled":
      return "bg-rose-50 text-rose-700 hover:bg-rose-50";

    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function CustomerDashboardPage({session}:any) {
  const [search, setSearch] =
    useState("");

  const {
    data,
    isLoading,
    isError,
  } =
    useCustomerDashboard();

  const popularServices =
    data?.popularServices ||
    [];

  const recentBookings =
    data?.recentBookings ||
    [];

  const activity =
    data?.activity || {};

  const customer =
    data?.customer;

  const continueService =
    data?.continueService;

  const greeting = useMemo(
    () => getGreeting(),
    [],
  );

  if (isLoading) {
    return (
      <CustomerDashboardSkeleton />
    );
  }

  if (isError) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">
            Unable to load your dashboard
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  function handleSearch() {
    const value =
      search.trim();

    if (!value) {
      return;
    }

    window.location.href =
      `/customer/services?service=${encodeURIComponent(
        value,
      )}`;
  }

  return (
    <div className="space-y-8">

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8 lg:p-10">

        <div className="relative">

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-coral/20 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-brand-teal/20 blur-3xl" />

          <div className="relative">

            <div className="max-w-2xl">

              <p className="text-sm font-medium text-slate-400">
                {greeting},{" "}
                {customer?.name
                  ?.split(" ")[0] ||
                  "there"}{" "}
                👋
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                What service do you need today?
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Find trusted service providers near you,
                compare prices, and book with confidence.
              </p>

            </div>

            {/* Search */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">

              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <Input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleSearch();
                    }
                  }}
                  placeholder="Search AC repair, plumbing, cleaning..."
                  className="h-12 rounded-xl border-white/10 bg-white/10 pl-11 text-white placeholder:text-slate-400 focus-visible:ring-white/20"
                />
              </div>

              <Button
                onClick={
                  handleSearch
                }
                className="h-12 rounded-xl bg-white px-6 text-slate-950 hover:bg-slate-100"
              >
                <Search className="mr-2 h-4 w-4" />
                Search Services
              </Button>

            </div>

          </div>
        </div>
      </section>

      {/* Popular services */}
      <section>

        <div className="mb-4 flex items-end justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-brand-coral">
              Discover
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Popular services
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Explore services with active providers.
            </p>
          </div>

          <Button
            asChild
            variant="ghost"
            className="rounded-xl "
          >
            <Link href="/customer/services">
              View all
              <ArrowRight className="ml-2 h-4 w-4 inline" />
            </Link>
          </Button>

        </div>

        {popularServices.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-muted-foreground" />

              <p className="mt-3 font-medium">
                Services are coming soon
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                No active service offerings are available yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {popularServices.map(
              (service: any) => (
                <Link
                  key={service.id}
                  href={`/customer/services?service=${encodeURIComponent(
                    service.id,
                  )}`}
                >
                  <Card className="group h-full rounded-2xl border-border/70 transition hover:-translate-y-1 hover:shadow-lg">

                    <CardContent className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                          <Wrench className="h-5 w-5" />
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />

                      </div>

                      <h3 className="mt-5 font-semibold">
                        {service.name}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.providerCount}{" "}
                        {service.providerCount === 1
                          ? "provider"
                          : "providers"}{" "}
                        available
                      </p>

                    </CardContent>
                  </Card>
                </Link>
              ),
            )}

          </div>
        )}

      </section>

      {/* Activity */}
      <section>

        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Your activity
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            A quick view of your current services and payments.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <ActivityCard
            label="Active requests"
            value={
              activity.activeRequests ||
              0
            }
            icon={Clock3}
            href="/customer/bookings"
          />

          <ActivityCard
            label="Upcoming"
            value={
              activity.upcoming ||
              0
            }
            icon={CalendarDays}
            href="/customer/bookings"
          />

          <ActivityCard
            label="Completed"
            value={
              activity.completed ||
              0
            }
            icon={CheckCircle2}
            href="/customer/bookings"
          />

          <ActivityCard
            label="Unpaid"
            value={
              activity.unpaid ||
              0
            }
            icon={FileText}
            href="/customer/invoice"
            attention={
              Number(
                activity.unpaid ||
                  0,
              ) > 0
            }
          />

        </div>

      </section>

      {/* Continue current service */}
      {continueService && (
        <section>

          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Continue your service
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Pick up where you left off.
            </p>
          </div>

          <Link
            href={`/customer/bookings/${continueService.booking._id}`}
          >
            <Card className="group overflow-hidden rounded-3xl border-border/70 transition hover:shadow-lg">

              <CardContent className="p-0">

                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex min-w-0 items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-coral/10 text-brand-coral">
                      <Wrench className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-semibold">
                          {
                            continueService
                              .booking
                              .serviceType
                          }
                        </h3>

                        <Badge
                          className={`rounded-full ${bookingStatusClass(
                            continueService
                              .booking
                              .status,
                          )}`}
                        >
                          {bookingStatusLabel(
                            continueService
                              .booking
                              .status,
                          )}
                        </Badge>

                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {
                          continueService
                            .booking
                            .serviceProviderId
                            ?.companyName ||
                          "Service provider"
                        }
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">

                        {continueService
                          .booking
                          .address
                          ?.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {
                              continueService
                                .booking
                                .address
                                .city
                            }
                          </span>
                        )}

                        {continueService
                          .booking
                          .scheduledAt && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(
                              continueService
                                .booking
                                .scheduledAt,
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            )}
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  <Button
                    variant="outline"
                    className="rounded-xl"
                  >
                    Track Service
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                </div>

              </CardContent>
            </Card>
          </Link>

        </section>
      )}

      {/* Recent bookings */}
      <section>

        <div className="mb-4 flex items-end justify-between gap-4">

          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Recent bookings
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your latest service activity.
            </p>
          </div>

          <Button
            asChild
            variant="ghost"
            className="rounded-xl"
          >
            <Link href="/customer/bookings">
              View all
              <ArrowRight className="ml-2 h-4 w-4 inline" />
            </Link>
          </Button>

        </div>

        {recentBookings.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">

              <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground" />

              <p className="mt-3 font-medium">
                No bookings yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Find a service provider to get started.
              </p>

              <Button
                asChild
                className="mt-4 rounded-xl"
              >
                <Link href="/customer/discovery">
                  Find a service
                </Link>
              </Button>

            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">

            {recentBookings.map(
              (booking: any) => (
                <Link
                  key={booking._id}
                  href={`/customer/bookings/${booking._id}`}
                >
                  <Card className="rounded-2xl border-border/70 transition hover:bg-muted/30">

                    <CardContent className="p-5">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-medium">
                              {
                                booking.serviceType
                              }
                            </h3>

                            <Badge
                              className={`rounded-full ${bookingStatusClass(
                                booking.status,
                              )}`}
                            >
                              {bookingStatusLabel(
                                booking.status,
                              )}
                            </Badge>

                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {
                              booking
                                .serviceProviderId
                                ?.companyName ||
                              "Service provider"
                            }
                          </p>

                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">

                            {booking
                              .address
                              ?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {
                                  booking
                                    .address
                                    .city
                                }
                              </span>
                            )}

                            {booking
                              .scheduledAt && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date(
                                  booking.scheduledAt,
                                ).toLocaleDateString(
                                  "en-IN",
                                )}
                              </span>
                            )}

                          </div>

                        </div>

                        <div className="flex items-center gap-4">

                          <div className="text-right">
                            <p className="font-semibold">
                              {currency(
                                booking
                                  .pricing
                                  ?.finalPrice ??
                                  booking
                                    .estimatedPrice ??
                                  0,
                              )}
                            </p>

                            {booking
                              .invoice
                              ?.balanceDue >
                              0 && (
                              <p className="mt-1 text-xs text-amber-600">
                                Payment due{" "}
                                {currency(
                                  booking
                                    .invoice
                                    .balanceDue,
                                )}
                              </p>
                            )}
                          </div>

                          <ArrowRight className="h-4 w-4 text-muted-foreground" />

                        </div>

                      </div>

                    </CardContent>
                  </Card>
                </Link>
              ),
            )}

          </div>
        )}

      </section>

      {/* Quick actions */}
      <section>

        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Quick actions
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">

          <QuickAction
            href="/customer/services"
            icon={Search}
            title="Find a service"
            description="Discover providers near you"
          />

          <QuickAction
            href="/customer/bookings"
            icon={CalendarDays}
            title="My bookings"
            description="Track your service requests"
          />

          <QuickAction
            href="/customer/invoice"
            icon={FileText}
            title="Invoices"
            description="View bills and payments"
          />

        </div>

      </section>

    </div>
  );
}

function ActivityCard({
  label,
  value,
  icon: Icon,
  href,
  attention = false,
}: {
  label: string;
  value: number;
  icon: any;
  href: string;
  attention?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="rounded-2xl border-border/70 transition hover:-translate-y-0.5 hover:shadow-md">

        <CardContent className="p-5">

          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="text-sm text-muted-foreground">
                {label}
              </p>

              <p
                className={`mt-2 text-2xl font-semibold ${
                  attention
                    ? "text-amber-600"
                    : ""
                }`}
              >
                {value}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Icon className="h-4 w-4" />
            </div>

          </div>

        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="group rounded-2xl border-border/70 transition hover:-translate-y-0.5 hover:shadow-md">

        <CardContent className="flex items-center gap-4 p-5">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {title}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />

        </CardContent>

      </Card>
    </Link>
  );
}

function CustomerDashboardSkeleton() {
  return (
    <div className="space-y-8">

      <div className="h-64 animate-pulse rounded-3xl bg-muted" />

      <div className="space-y-4">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-muted"
              />
            ),
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-muted"
              />
            ),
          )}
        </div>
      </div>

      <div className="h-40 animate-pulse rounded-3xl bg-muted" />

    </div>
  );
}