"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  IndianRupee,
  MapPin,
  UserRound,
  Wrench,
} from "lucide-react";

import { toast } from "sonner";

import {
  useAssignTechnician,
  useProviderBooking,
} from "@/hooks/useProviderBooking";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useProviderAssignedJob, useProviderAssignedJobs } from "@/hooks/useProviderAssignedJobs";

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ProviderBookingDetailPage() {
  const params = useParams();
  const router = useRouter();

  const bookingId = String(params.id);

  const { data, isLoading, isError } = useProviderBooking(bookingId);

  console.log("booking data",data);

  //const job2 = data.technicians
  //const {data:jobdata} = useProviderAssignedJob()

  // const job = jobdata?.jobs || [];

  // console.log("job data is",job);

  const job = data?.job;

  const assignTechnician = useAssignTechnician(bookingId);

  const booking = data?.booking;
  const technicians = data?.technicians || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">Booking not found</h2>

          <Button
            onClick={() => router.push("/service-provider/bookings")}
            className="mt-5 rounded-xl"
          >
            Back to bookings
          </Button>
        </CardContent>
      </Card>
    );
  }

  const customer = booking.customerId;

  const offering = booking.serviceOfferingId;

  const pricing = booking.pricing;

  const assignedTechnician = booking.technicianId;

  async function handleAssign(technicianId: string) {
    try {
      await assignTechnician.mutateAsync(technicianId);

      toast.success("Technician assigned successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || "Unable to assign technician",
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-2 -ml-3 rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Booking Details
            </h1>

            <Badge className="rounded-full" variant="secondary">
              {booking.status}
            </Badge>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Review the customer's request and assign the right technician.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Main */}
        <div className="space-y-6">
          {/* Service */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <p className="text-xl font-semibold">
                  {offering?.name || booking.serviceType}
                </p>

                {offering?.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {offering.description}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Provider price
                  </p>

                  <p className="mt-1 font-semibold">
                    {currency(
                      pricing?.basePrice || booking.estimatedPrice || 0,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Discount</p>

                  <p className="mt-1 font-semibold">
                    {currency(pricing?.discountAmount || 0)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-xs text-slate-400">Customer price</p>

                  <p className="mt-1 text-lg font-semibold">
                    {currency(
                      pricing?.finalPrice || booking.estimatedPrice || 0,
                    )}
                  </p>
                </div>
              </div>

              {pricing?.offerName && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Offer applied:{" "}
                  <span className="font-semibold">{pricing.offerName}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">{customer?.name || "Customer"}</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {customer?.phone || "Phone unavailable"}
                </p>

                {customer?.email && (
                  <p className="text-sm text-muted-foreground">
                    {customer.email}
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">Service address</p>

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

          {/* Schedule */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                  <Clock3 className="h-4 w-4" />
                </div>

                <div>
                  <p className="font-medium">
                    {booking.scheduledAt
                      ? new Date(booking.scheduledAt).toLocaleDateString(
                          "en-IN",
                          {
                            dateStyle: "full",
                          },
                        )
                      : "Flexible schedule"}
                  </p>

                  {booking.scheduledAt && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.scheduledAt).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Assignment */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle>Assign Technician</CardTitle>

              <p className="text-sm text-muted-foreground">
                Select a technician who will fulfill this booking.
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {technicians.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <UsersIcon />

                  <h3 className="mt-3 font-medium">No technicians available</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Add an active technician to assign this booking.
                  </p>

                  <Button asChild variant="outline" className="mt-4 rounded-xl">
                    <a href="/service-provider/manage-technicians">Add Technician</a>
                  </Button>
                </div>
              ) : (
                technicians.map((technician: any) => {
                  const isBusy = technician.status === "busy";

                  const name = technician.userId?.name || "Technician";

                  return (
                    <div
                      key={technician._id}
                      className="rounded-2xl border p-4 transition hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                            {name.slice(0, 1).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-medium">{name}</p>

                            <p className="text-xs text-muted-foreground">
                              {technician.userId?.phone || "No phone"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1">
                              {(technician.skills || [])
                                .slice(0, 3)
                                .map((skill: string) => (
                                  <Badge
                                    key={skill}
                                    variant="secondary"
                                    className="rounded-full text-[10px]"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        </div>

                        <Badge
                          className={
                            isBusy
                              ? "rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50"
                              : "rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          }
                        >
                          {technician.status}
                        </Badge>
                      </div>

                      <Button
                        className="mt-4 w-full rounded-xl"
                        variant={isBusy ? "outline" : "default"}
                        disabled={
                          isBusy ||
                          assignTechnician.isPending ||
                          booking.status === "assigned"
                        }
                        onClick={() => handleAssign(technician._id)}
                      >
                        {booking.status === "assigned"
                          ? "Technician Assigned"
                          : isBusy
                            ? "Currently Busy"
                            : "Assign Technician"}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Status timeline */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle>Booking Status</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-5">
                <StatusStep
                  label="Request accepted"
                  complete={["confirmed", "assigned"].includes(booking.status)}
                />

                <StatusStep
                  label="Technician assigned"
                  complete={
                    booking.status === "assigned" ||
                    Boolean(booking.technicianId)
                  }
                />

                {/* <StatusStep label="Job in progress" complete={false} />

                <StatusStep label="Job completed" complete={false} /> */}
              </div>
            </CardContent>
          </Card>

          {job ? (
  <div className="rounded-2xl border p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs text-muted-foreground">
          Assigned Job
        </p>

        <p className="mt-1 text-lg font-semibold">
          {job.status}
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          This booking has moved into technician execution.
        </p>
      </div>

      <Button
        asChild
        className="rounded-xl"
      >
        <Link
          href={`/service-provider/assigned-jobs/${job._id}`}
        >
          View Assigned Job
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  </div>
) : (
  <div className="rounded-2xl border p-4">
    <p className="font-medium">
      Technician not assigned
    </p>

    <p className="mt-1 text-sm text-muted-foreground">
      Assign a technician to create the operational job.
    </p>

    {/* your existing assign technician UI */}
  </div>
)}
        </div>
      </div>
    </div>
  );
}

function StatusStep({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          complete
            ? "bg-emerald-100 text-emerald-700"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {complete ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-current" />
        )}
      </div>

      <span
        className={
          complete ? "text-sm font-medium" : "text-sm text-muted-foreground"
        }
      >
        {label}
      </span>
    </div>
  );
}

function UsersIcon() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
      <UserRound className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}
