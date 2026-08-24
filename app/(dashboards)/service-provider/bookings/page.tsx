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

// import {
//   useProviderBookings,
// } from "@/hooks/useProviderBookings";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProviderBooking } from "@/hooks/useProviderBookings";


const STATUS_OPTIONS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "assigned",
    label: "Assigned",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "rescheduled",
    label: "Rescheduled",
  },
];

function currency(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(value || 0);
}

function getStatusClass(
  status: string
) {
  switch (status) {
    case "confirmed":
      return "bg-blue-50 text-blue-700 hover:bg-blue-50";

    case "assigned":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

    case "cancelled":
      return "bg-rose-50 text-rose-700 hover:bg-rose-50";

    case "rescheduled":
      return "bg-amber-50 text-amber-700 hover:bg-amber-50";

    default:
      return "";
  }
}

export default function ProviderBookingsPage() {
  const [status, setStatus] =
    useState("all");

  const [search, setSearch] =
    useState("");

//   const {
//     data,
//     isLoading,
//     isError,
//   } = useProviderBookings(status);

const {data,isLoading,isError} = useProviderBooking(status)

  const bookings =
    data?.bookings || [];

    console.log("booking data",bookings)

  const filteredBookings =
    bookings.filter(
      (booking: any) => {
        const searchText =
          search.toLowerCase();

        return (
          booking.serviceType
            ?.toLowerCase()
            .includes(searchText) ||
          booking.customerId?.name
            ?.toLowerCase()
            .includes(searchText) ||
          booking.customerId?.phone
            ?.toLowerCase()
            .includes(searchText) ||
          booking.address?.city
            ?.toLowerCase()
            .includes(searchText)
        );
      }
    );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">
            Unable to load bookings
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
      <div>
        <div className="mb-2 text-sm text-muted-foreground">
          Operations / Bookings
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">
          Bookings
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Manage accepted customer bookings,
          assignments, schedules, and job progress.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Total
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {bookings.length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Confirmed
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {
                bookings.filter(
                  (booking: any) =>
                    booking.status ===
                    "confirmed"
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Assigned
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {
                bookings.filter(
                  (booking: any) =>
                    booking.status ===
                    "assigned"
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Revenue value
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {currency(
                bookings.reduce(
                  (
                    total: number,
                    booking: any
                  ) =>
                    total +
                    Number(
                      booking
                        .pricing
                        ?.finalPrice ||
                        0
                    ),
                  0
                )
              )}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer, service, location..."
                className="h-11 rounded-xl pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(
                (option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      status ===
                      option.value
                        ? "default"
                        : "outline"
                    }
                    className="rounded-xl"
                    onClick={() =>
                      setStatus(
                        option.value
                      )
                    }
                  >
                    {option.label}
                  </Button>
                )
              )}
            </div>

          </div>

        </CardContent>
      </Card>

      {/* Booking list */}
      <Card className="rounded-2xl border-border/70">

        <CardHeader className="border-b border-border/60">
          <CardTitle>
            Customer bookings
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">

          {filteredBookings.length ===
          0 ? (
            <div className="p-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <CalendarClock className="h-6 w-6 text-muted-foreground" />
              </div>

              <h3 className="mt-4 font-semibold">
                No bookings found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Accepted customer requests will
                appear here.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-border">

              {filteredBookings.map(
                (booking: any) => (
                  <div
                    key={booking._id}
                    className="group p-5 transition hover:bg-muted/20"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* Main info */}
                      <div className="flex min-w-0 gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Wrench className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-semibold">
                              {booking
                                .serviceOfferingId
                                ?.name ||
                                booking.serviceType}
                            </h3>

                            <Badge
                              className={`rounded-full ${getStatusClass(
                                booking.status
                              )}`}
                            >
                              {booking.status}
                            </Badge>

                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">

                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="h-3.5 w-3.5" />

                              {booking
                                .customerId
                                ?.name ||
                                "Customer"}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />

                              {booking
                                .address
                                ?.city ||
                                "Location"}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />

                              {booking
                                .scheduledAt
                                ? new Date(
                                    booking.scheduledAt
                                  ).toLocaleString(
                                    "en-IN",
                                    {
                                      dateStyle:
                                        "medium",
                                      timeStyle:
                                        "short",
                                    }
                                  )
                                : "Flexible"}
                            </span>

                          </div>

                          {booking
                            .technicianId && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Technician assigned
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex items-center justify-between gap-5 lg:justify-end">

                        <div className="text-right">

                          <div className="font-semibold">
                            {currency(
                              booking
                                .pricing
                                ?.finalPrice ||
                                booking.estimatedPrice ||
                                0
                            )}
                          </div>

                          {booking
                            .pricing
                            ?.offerName && (
                            <div className="text-xs text-emerald-600">
                              {
                                booking
                                  .pricing
                                  .offerName
                              }
                            </div>
                          )}

                        </div>

                        <Button
                          asChild
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Link
                            href={`/service-provider/bookings/${booking._id}`}
                          >
                            View
                            <ArrowRight className="ml-2 h-4 w-4 inline" />
                          </Link>
                        </Button>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}