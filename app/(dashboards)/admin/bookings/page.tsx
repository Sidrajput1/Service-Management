'use client';
import { useBookings, useCreateBooking } from "@/hooks/useBookings";
import { useCreateJob, useJobs } from "@/hooks/useJobs";
import { useCustomers, useLeads, useTechnicians } from "@/hooks/useLead";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const BookingSchema = z.object({
      leadId: z.string().optional(),
    customerId: z.string().optional(),
    serviceType: z.string().min(1, "Service type is required"),
    subService: z.string().optional(),
    scheduledAt: z.string().optional(),
    estimatedPrice: z.string().optional(),
    addressLine: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    notes: z.string().optional(),
})
.superRefine((data, ctx) => {
    if (!data.leadId && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerId"],
        message: "Select either a lead or a customer",
      });
    }
  });

type BookingForm = z.infer<typeof BookingSchema>;

function AdminBookingsPage() {
  const [page, setPage] = useState(1);

  const [jobBooking, setJobBooking] = useState<any>(null);
  const [jobTechnicianId, setJobTechnicianId] = useState("");

  const { data: bookingsData, isLoading } = useBookings(page, 20);

  const { data: jobsData } = useJobs(1, 200);
  const { data: leadsData } = useLeads(1, 100) as { data: { leads: any[] } };

  const { data: customerData } = useCustomers(1, 100);
  const { data: technicianData } = useTechnicians(1, 100);

  const createBooking = useCreateBooking();
  const createJob = useCreateJob();

  const bookingJobMap = useMemo(() => {
    const map = new Map<string, any>();
    (jobsData?.jobs || []).forEach((job: any) => {
      const bookingId = jobBooking?.bookingId?._id || job.bookingId;
      map.set(String(bookingId), job);
    });

    return map;
  }, [jobsData]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(BookingSchema),
  });

  async function onSubmit(values:BookingForm){
    await createBooking.mutateAsync({
        leadId: values.leadId || null,
      customerId: values.customerId || null,
      serviceType: values.serviceType,
      subService: values.subService || null,
      scheduledAt: values.scheduledAt || null,
      estimatedPrice: values.estimatedPrice ? Number(values.estimatedPrice) : null,
      address: {
        addressLine: values.addressLine || null,
        city: values.city || null,
        state: values.state || null,
        pincode: values.pincode || null,
      },
      notes: values.notes || null,
    });

    reset();
    setPage(1);
  };

  async function handleCreateJob() {
    console.log("clicked")
    if (!jobBooking){
     // return "Job booking is not complete"
     console.log("Job booking is not working")
    } 
    await createJob.mutateAsync({
      bookingId: jobBooking._id,
      technicianId: jobTechnicianId || null,
      scheduledAt: jobBooking.scheduledAt || null,
      notes: `Created from booking ${jobBooking._id}`,
      proofRequired: true,
    });

    setJobBooking(null);
    setJobTechnicianId("");
  }


  return (
     <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Lead</Label>
                  <select
                    {...register("leadId")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select lead</option>
                    {(leadsData?.leads || []).map((lead: any) => (
                      <option key={lead._id} value={lead._id}>
                        {lead.name || lead.phone || "Unnamed lead"} — {lead.serviceRequested}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Customer</Label>
                  <select
                    {...register("customerId")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select customer</option>
                    {(customerData?.customers || []).map((customer: any) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} — {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Service Type</Label>
                  <Input {...register("serviceType")} placeholder="AC Repair / Plumbing / etc." />
                  {errors.serviceType && (
                    <p className="mt-1 text-sm text-red-500">{errors.serviceType.message}</p>
                  )}
                </div>

                <div>
                  <Label>Sub Service</Label>
                  <Input {...register("subService")} placeholder="Optional" />
                </div>

                <div>
                  <Label>Scheduled At</Label>
                  <Input {...register("scheduledAt")} type="datetime-local" />
                </div>

                <div>
                  <Label>Estimated Price</Label>
                  <Input {...register("estimatedPrice")} type="number" placeholder="0" />
                </div>

                <div>
                  <Label>Address Line</Label>
                  <Input {...register("addressLine")} placeholder="House / Street / Area" />
                </div>

                <div>
                  <Label>City</Label>
                  <Input {...register("city")} placeholder="City" />
                </div>

                <div>
                  <Label>State</Label>
                  <Input {...register("state")} placeholder="State" />
                </div>

                <div>
                  <Label>Pincode</Label>
                  <Input {...register("pincode")} placeholder="Pincode" />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Input {...register("notes")} placeholder="Short booking note" />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createBooking.isPending}>
                  {createBooking.isPending ? "Saving..." : "Create Booking"}
                </Button>
                <Button type="button" variant="outline" onClick={() => reset()}>
                  Reset
                </Button>
              </div>

              {errors.customerId && (
                <p className="text-sm text-red-500">{errors.customerId.message}</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer / Lead</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>Loading...</TableCell>
                    </TableRow>
                  ) : (
                    (bookingsData?.bookings || []).map((booking: any) => {
                      const existingJob = bookingJobMap.get(String(booking._id));
                      return (
                        <TableRow key={booking._id}>
                          <TableCell>
                            <div className="font-medium">
                              {booking.customerId?.name || "Customer"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.customerId?.phone || "-"}
                            </div>
                            {booking.leadId && (
                              <div className="text-xs text-muted-foreground">
                                Lead: {booking.leadId?.name || booking.leadId?.phone || "-"}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.serviceType}</div>
                            <div className="text-xs text-muted-foreground">
                              {booking.subService || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {booking.scheduledAt
                              ? new Date(booking.scheduledAt).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{booking.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {existingJob ? (
                              <div className="space-y-1">
                                <Badge>{existingJob.status}</Badge>
                                <div className="text-xs text-muted-foreground">
                                  {existingJob.technicianId?.userId?.name ||
                                    existingJob.technicianId?.name ||
                                    "Assigned"}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline">No job yet</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => setJobBooking(booking)}
                              disabled={!!existingJob}
                            >
                              {existingJob ? "Job Created" : "Create Job"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div>Page {page}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {jobBooking && (
          <Card>
            <CardHeader>
              <CardTitle>Create Job for Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <div>
                  <strong>Customer:</strong> {jobBooking.customerId?.name || "Customer"}
                </div>
                <div>
                  <strong>Service:</strong> {jobBooking.serviceType}
                </div>
                <div>
                  <strong>Scheduled:</strong>{" "}
                  {jobBooking.scheduledAt
                    ? new Date(jobBooking.scheduledAt).toLocaleString()
                    : "-"}
                </div>
              </div>

              <div>
                <Label>Technician</Label>
                <select
                  value={jobTechnicianId}
                  onChange={(e) => setJobTechnicianId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">Select technician</option>
                  {(technicianData?.technicians || []).map((tech: any) => (
                    <option key={tech._id} value={tech._id}>
                      {tech.userId?.name || tech.userId?.email || "Technician"} — {tech.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 border-2">
                <Button onClick={handleCreateJob} className="bg-blue-500 text-white hover:bg-blue-600" disabled={createJob.isPending}>
                  {createJob.isPending ? "Creating..." : "Create Job"}
                </Button>
                <Button variant="outline" onClick={() => setJobBooking(null)}>
                  Cancel
                </Button>
              </div>

              <Separator />

              <p className="text-sm mt-8 text-yellow-800">
                A job will be created from this booking. If a technician is selected, the system
                will assign that technician and generate OTP automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default AdminBookingsPage;
