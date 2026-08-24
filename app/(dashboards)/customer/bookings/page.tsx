"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {  useNewCustomerBookings } from "@/hooks/useCustomerBookings";

const TABS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "upcoming",
    label: "Upcoming",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

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

function getStatusStyle(
  status: string,
) {
  switch (status) {
    case "active":
      return "bg-blue-50 text-blue-700 hover:bg-blue-50";

    case "upcoming":
      return "bg-amber-50 text-amber-700 hover:bg-amber-50";

    case "completed":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

    case "cancelled":
      return "bg-rose-50 text-rose-700 hover:bg-rose-50";

    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(
  status: string,
) {
  switch (status) {
    case "active":
      return "In progress";

    case "upcoming":
      return "Upcoming";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "pending":
      return "Pending";

    default:
      return status;
  }
}

export default function CustomerBookingsPage() {
  const [status, setStatus] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const {
    data,
    isLoading,
    isError,
  } = useNewCustomerBookings(status);

  const bookings =
    data?.bookings || [];

  const counts =
    data?.counts || {};

  const filteredBookings =
    bookings.filter(
      (booking: any) => {
        const searchText =
          search
            .trim()
            .toLowerCase();

        if (!searchText) {
          return true;
        }

        return (
          booking.serviceType
            ?.toLowerCase()
            .includes(searchText) ||
          booking.provider?.companyName
            ?.toLowerCase()
            .includes(searchText) ||
          booking.address?.city
            ?.toLowerCase()
            .includes(searchText)
        );
      },
    );

  if (isLoading) {
    return (
      <div className="space-y-6">

        <div className="h-28 animate-pulse rounded-3xl bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

        <div className="space-y-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">
            Unable to load your bookings
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh the page and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

          <div>
            <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">
              Service History
            </Badge>

            <h1 className="text-3xl font-semibold tracking-tight">
              My Bookings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Track your services, technicians,
              payments, and completed work in one place.
            </p>
          </div>

          <Button
            asChild
            className="rounded-xl bg-white text-slate-950 hover:bg-slate-100"
          >
            <Link href="/customer/services">
              <Wrench className="mr-2 h-4 w-4 inline" />
              Find a Service
            </Link>
          </Button>

        </div>

      </section>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <SummaryCard
          label="Total bookings"
          value={counts.all || 0}
          icon={CalendarClock}
        />

        <SummaryCard
          label="Upcoming"
          value={counts.upcoming || 0}
          icon={Clock3}
        />

        <SummaryCard
          label="Active"
          value={counts.active || 0}
          icon={Wrench}
        />

        <SummaryCard
          label="Completed"
          value={counts.completed || 0}
          icon={CheckCircle2}
        />

      </div>

      {/* Search and filters */}
      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search your bookings..."
                className="h-11 rounded-xl pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {TABS.map(
                (tab) => (
                  <Button
                    key={tab.value}
                    type="button"
                    variant={
                      status ===
                      tab.value
                        ? "default"
                        : "outline"
                    }
                    className="rounded-xl"
                    onClick={() =>
                      setStatus(
                        tab.value,
                      )
                    }
                  >
                    {tab.label}

                    {tab.value !==
                      "all" &&
                      counts[
                        tab.value
                      ] > 0 && (
                        <span className="ml-2 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                          {
                            counts[
                              tab.value
                            ]
                          }
                        </span>
                      )}
                  </Button>
                ),
              )}
            </div>

          </div>

        </CardContent>
      </Card>

      {/* Booking list */}
      {filteredBookings.length ===
      0 ? (
        <EmptyBookings />
      ) : (
        <div className="space-y-4">

          {filteredBookings.map(
            (booking: any) => (
              <BookingCard
                key={booking._id}
                booking={booking}
              />
            ),
          )}

        </div>
      )}

    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-5">

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {label}
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {value}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function BookingCard({
  booking,
}: {
  booking: any;
}) {
  const provider =
    booking.provider;

  const offering =
    booking.serviceOffering;

  const job =
    booking.job;

  const pricing =
    booking.pricing;

  const status =
    booking.customerStatus;

  const technician =
    booking.technician;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 transition hover:-translate-y-0.5 hover:shadow-md">

      <CardContent className="p-0">

        <div className="p-5 sm:p-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            {/* Left */}
            <div className="flex min-w-0 gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Wrench className="h-5 w-5" />
              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <h2 className="font-semibold">
                    {offering?.name ||
                      booking.serviceType}
                  </h2>

                  <Badge
                    className={`rounded-full ${getStatusStyle(
                      status,
                    )}`}
                  >
                    {getStatusLabel(
                      status,
                    )}
                  </Badge>

                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {provider?.companyName ||
                    "Service Provider"}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">

                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />

                    {booking.address
                      ?.city ||
                      "Location"}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />

                    {booking.scheduledAt
                      ? new Date(
                          booking.scheduledAt,
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "Flexible"}
                  </span>

                  {technician?.userId?.name && (
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5" />

                      {technician.userId.name}
                    </span>
                  )}

                </div>

              </div>
            </div>

            {/* Right */}
            <div className="flex items-center justify-between gap-6 lg:justify-end">

              <div className="text-right">

                <div className="text-lg font-semibold">
                  {currency(
                    pricing?.finalPrice ||
                      booking.estimatedPrice ||
                      0,
                  )}
                </div>

                {pricing?.discountAmount >
                  0 && (
                  <p className="text-xs text-emerald-600">
                    You saved{" "}
                    {currency(
                      pricing.discountAmount,
                    )}
                  </p>
                )}

              </div>

              <Button
                asChild
                className="rounded-xl"
              >
                <Link
                  href={`/customer/bookings/${booking._id}`}
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4 inline" />
                </Link>
              </Button>

            </div>

          </div>

          {/* Active status strip */}
          {status === "active" &&
            job && (
              <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-blue-800">

                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />

                  Your service is in progress
                </div>

                <p className="mt-1 text-xs text-blue-700/80">
                  Open the booking to track your technician and service timeline.
                </p>

              </div>
            )}

          {status === "completed" && (
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-emerald-800">

              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />

                Service completed
              </div>

              <p className="mt-1 text-xs text-emerald-700/80">
                View the booking to see payment and invoice details.
              </p>

            </div>
          )}

        </div>

      </CardContent>
    </Card>
  );
}

function EmptyBookings() {
  return (
    <Card className="rounded-3xl border-border/70">
      <CardContent className="p-14 text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <CalendarClock className="h-6 w-6 text-muted-foreground" />
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          No bookings yet
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Find a service, choose a trusted provider,
          and your bookings will appear here.
        </p>

        <Button
          asChild
          className="mt-5 rounded-xl"
        >
          <Link href="/customer/services">
            Find a Service
          </Link>
        </Button>

      </CardContent>
    </Card>
  );
}