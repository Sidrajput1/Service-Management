"use client";

import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  UserRound,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import {
  useAcceptBookingRequest,
  useProviderBookingRequests,
} from "@/hooks/useProviderBookingRequests";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

function currency(
  value: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(value || 0);
}

export default function ProviderBookingRequestsPage() {
  const {
    data,
    isLoading,
    isError,
  } = useProviderBookingRequests();

  const acceptRequest =
    useAcceptBookingRequest();

  const requests =
    data?.requests || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          Unable to load booking requests.
        </CardContent>
      </Card>
    );
  }

  async function handleAccept(
    requestId: string
  ) {
    try {
      await acceptRequest.mutateAsync(
        requestId
      );

      toast.success(
        "Booking request accepted"
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          "Unable to accept request"
      );
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="mb-2 text-sm text-muted-foreground">
          Operations / Booking Requests
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">
          Booking Requests
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Review customer requests and decide which
          services your team will fulfill.
        </p>
      </div>

      {/* Request count */}
      <div className="grid gap-4 sm:grid-cols-3">

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">
              Pending requests
            </div>

            <div className="mt-2 text-2xl font-semibold">
              {requests.length}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">
              Needs attention
            </div>

            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              <Clock3 className="h-5 w-5 text-amber-600" />
              {requests.length}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">
              New opportunities
            </div>

            <div className="mt-2 text-2xl font-semibold">
              {requests.length}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Requests */}
      <Card className="rounded-2xl border-border/70">

        <CardHeader>
          <CardTitle>
            New customer requests
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">

          {requests.length === 0 ? (
            <div className="p-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <CalendarClock className="h-6 w-6 text-muted-foreground" />
              </div>

              <h3 className="mt-4 font-semibold">
                No new requests
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                When customers choose your services,
                their requests will appear here.
              </p>

              <Button
                asChild
                variant="outline"
                className="mt-5 rounded-xl"
              >
                <Link
                  href="/service-provider/services"
                >
                  Manage services
                </Link>
              </Button>

            </div>
          ) : (
            <div className="divide-y divide-border">

              {requests.map(
                (request: any) => {

                  const offering =
                    request.serviceOfferingId;

                  return (
                    <div
                      key={request._id}
                      className="p-5 transition hover:bg-muted/20"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* Request information */}
                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-base font-semibold">
                              {offering?.name ||
                                request.serviceName}
                            </h3>

                            <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                              New
                            </Badge>

                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">

                            <div className="flex items-center gap-2">
                              <UserRound className="h-4 w-4" />

                              {request
                                .customerId
                                ?.name ||
                                "Customer"}
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />

                              {request.address
                                ?.city ||
                                "Location"}
                            </div>

                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4" />

                              {request.preferredDate
                                ? new Date(
                                    request.preferredDate
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
                            </div>

                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />

                              {currency(
                                request
                                  .pricing
                                  ?.finalPrice ||
                                  0
                              )}
                            </div>

                          </div>

                          {request.description && (
                            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                              {request.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 gap-2">

                          <Button
                            variant="outline"
                            className="rounded-xl"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Decline
                          </Button>

                          <Button
                            onClick={() =>
                              handleAccept(
                                request._id
                              )
                            }
                            disabled={
                              acceptRequest.isPending
                            }
                            className="rounded-xl"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />

                            {acceptRequest.isPending
                              ? "Accepting..."
                              : "Accept Request"}
                          </Button>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}