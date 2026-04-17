"use client";
import { useBookings, useCreateBooking } from "@/hooks/useBookings";
import { useCreateJob, useJobs } from "@/hooks/useJobs";
import { useCustomers, useLeads, useTechnicians } from "@/hooks/useLead";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePriceItem } from "@/hooks/usePriceItem";
import PricePicker from "@/components/price-master/PricePicker";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BookingSchema = z
  .object({
    leadId: z.string().optional(),
    customerId: z.string().optional(),
    serviceType: z.string().min(1, "Service type is required"),
    serviceTypeId: z.string().optional(),
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

function statusBadge(status?: string) {
  const s = (status || "pending").toLowerCase();

  if (s.includes("complete") || s.includes("done") || s.includes("closed")) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Completed
      </Badge>
    );
  }
  if (s.includes("cancel")) {
    return (
      <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
        Cancelled
      </Badge>
    );
  }
  if (s.includes("confirm")) {
    return (
      <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
        Confirmed
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
      Pending
    </Badge>
  );
}

function jobStatusBadge(status?: string) {
  const s = (status || "new").toLowerCase();

  if (s.includes("complete")) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Completed
      </Badge>
    );
  }
  if (s.includes("progress") || s.includes("active")) {
    return (
      <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
        In Progress
      </Badge>
    );
  }
  if (s.includes("assigned")) {
    return (
      <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
        Assigned
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
      New
    </Badge>
  );
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function AdminBookingsPage() {
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [jobBooking, setJobBooking] = useState<any>(null);
  const [jobTechnicianId, setJobTechnicianId] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");

  const { data: bookingsData, isLoading, refetch } = useBookings(page, 20);

  const { data: jobsData } = useJobs(1, 200);
  const { data: leadsData } = useLeads(1, 100) as { data: { leads: any[] } };

  const { data: customerData } = useCustomers(1, 100);
  const { data: technicianData } = useTechnicians(1, 100);

  const { data: priceData } = usePriceItem();

  //console.log("Price items", data?.items)

  const createBooking = useCreateBooking();
  const createJob = useCreateJob();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(BookingSchema),
  });

  const bookingJobMap = useMemo(() => {
    const map = new Map<string, any>();
    (jobsData?.jobs || []).forEach((job: any) => {
      const bookingId = jobBooking?.bookingId?._id || job.bookingId;
      map.set(String(bookingId), job);
    });

    return map;
  }, [jobsData]);

  const bookings = bookingsData?.bookings || [];

  // doing filter here
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b: any) => {
      const customerName = b.customerId?.name || "";
      const leadName = b.leadId?.name || "";
      const service = b.serviceType || "";
      const haystack = `${customerName} ${leadName} ${service}`.toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesSource =
        selectedSource === "all"
          ? true
          : (b.source || "").toLowerCase() === selectedSource;

      return matchesQuery && matchesSource;
    });
  }, [bookings, search, selectedSource]);

  // fetch stats
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b: any) =>
      (b.status || "").toLowerCase().includes("pending"),
    ).length;
    const confirmed = bookings.filter((b: any) =>
      (b.status || "").toLowerCase().includes("confirm"),
    ).length;
    const withJobs = bookings.filter((b: any) =>
      bookingJobMap.has(String(b._id)),
    ).length;

    return { total, pending, confirmed, withJobs };
  }, [bookings, bookingJobMap]);

  async function onSubmit(values: BookingForm) {
    try {
      await createBooking.mutateAsync({
        leadId: values.leadId || null,
        customerId: values.customerId || null,
        serviceType: values.serviceType,
        subService: values.subService || null,
        scheduledAt: values.scheduledAt || null,
        estimatedPrice: values.estimatedPrice
          ? Number(values.estimatedPrice)
          : null,
        address: {
          addressLine: values.addressLine || null,
          city: values.city || null,
          state: values.state || null,
          pincode: values.pincode || null,
        },
        notes: values.notes || null,
      });
      toast.success("Booking created successfully");
      reset();
      setPage(1);
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create booking");
    }
  }

  async function handleCreateJob() {
    console.log("clicked");
    if (!jobBooking) {
      // return "Job booking is not complete"
      toast.error("Please select a booking first");
      console.log("Job booking is not working");
      return;
    }

    try {
      await createJob.mutateAsync({
        bookingId: jobBooking._id,
        technicianId: jobTechnicianId || null,
        scheduledAt: jobBooking.scheduledAt || null,
        notes: `Created from booking ${jobBooking._id}`,
        proofRequired: true,
      });
      toast.success("job created successfully");
      setJobBooking(null);
      setJobTechnicianId("");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create job");
    }
  }

  return (
    //  <div className="p-6">
    //   <div className="mx-auto max-w-7xl space-y-6">
    //     <Card>
    //       <CardHeader>
    //         <CardTitle>Create Booking</CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    //           <div className="grid gap-4 md:grid-cols-2">
    //             <div>
    //               <Label>Lead</Label>
    //               <select
    //                 {...register("leadId")}
    //                 className="w-full rounded-md border border-input bg-background px-3 py-2"
    //               >
    //                 <option value="">Select lead</option>
    //                 {(leadsData?.leads || []).map((lead: any) => (
    //                   <option key={lead._id} value={lead._id}>
    //                     {lead.name || lead.phone || "Unnamed lead"} — {lead.serviceRequested}
    //                   </option>
    //                 ))}
    //               </select>
    //             </div>

    //             <div>
    //               <Label>Customer</Label>
    //               <select
    //                 {...register("customerId")}
    //                 className="w-full rounded-md border border-input bg-background px-3 py-2"
    //               >
    //                 <option value="">Select customer</option>
    //                 {(customerData?.customers || []).map((customer: any) => (
    //                   <option key={customer._id} value={customer._id}>
    //                     {customer.name} — {customer.phone}
    //                   </option>
    //                 ))}
    //               </select>
    //             </div>

    //             {/* <div>
    //               <Label>Service Type</Label>
    //               <Input {...register("serviceType")} placeholder="AC Repair / Plumbing / etc." />
    //               {errors.serviceType && (
    //                 <p className="mt-1 text-sm text-red-500">{errors.serviceType.message}</p>
    //               )}
    //             </div> */}
    //             <PricePicker
    //               items={data?.items || []}
    //               itemType="service"
    //               value={watch("serviceTypeId") || ""}
    //               onChange={(item) => {
    //                 if (item) {
    //                   // Set the service type to the selected item's name
    //                   // and estimated price to the selected item's price
    //                   setValue("serviceTypeId", item._id);
    //                   setValue("serviceType", item.name);
    //                   setValue("estimatedPrice", String(item.price));
    //                 }
    //               }}
    //               label="Service Type"
    //             />

    //             <div>
    //               <Label>Sub Service</Label>
    //               <Input {...register("subService")} placeholder="Optional" />
    //             </div>

    //             <div>
    //               <Label>Scheduled At</Label>
    //               <Input {...register("scheduledAt")} type="datetime-local" />
    //             </div>

    //             <div>
    //               <Label>Estimated Price</Label>
    //               <Input {...register("estimatedPrice")} type="number" placeholder="0" />

    //             </div>

    //             <div>
    //               <Label>Address Line</Label>
    //               <Input {...register("addressLine")} placeholder="House / Street / Area" />
    //             </div>

    //             <div>
    //               <Label>City</Label>
    //               <Input {...register("city")} placeholder="City" />
    //             </div>

    //             <div>
    //               <Label>State</Label>
    //               <Input {...register("state")} placeholder="State" />
    //             </div>

    //             <div>
    //               <Label>Pincode</Label>
    //               <Input {...register("pincode")} placeholder="Pincode" />
    //             </div>
    //           </div>

    //           <div>
    //             <Label>Notes</Label>
    //             <Input {...register("notes")} placeholder="Short booking note" />
    //           </div>

    //           <div className="flex gap-2">
    //             <Button type="submit" disabled={createBooking.isPending}>
    //               {createBooking.isPending ? "Saving..." : "Create Booking"}
    //             </Button>
    //             <Button type="button" variant="outline" onClick={() => reset()}>
    //               Reset
    //             </Button>
    //           </div>

    //           {errors.customerId && (
    //             <p className="text-sm text-red-500">{errors.customerId.message}</p>
    //           )}
    //         </form>
    //       </CardContent>
    //     </Card>

    //     <Card>
    //       <CardHeader>
    //         <CardTitle>Bookings</CardTitle>
    //       </CardHeader>
    //       <CardContent className="space-y-4">
    //         <div className="overflow-auto rounded-md border">
    //           <Table>
    //             <TableHeader>
    //               <TableRow>
    //                 <TableHead>Customer / Lead</TableHead>
    //                 <TableHead>Service</TableHead>
    //                 <TableHead>Schedule</TableHead>
    //                 <TableHead>Status</TableHead>
    //                 <TableHead>Job</TableHead>
    //                 <TableHead>Action</TableHead>
    //               </TableRow>
    //             </TableHeader>
    //             <TableBody>
    //               {isLoading ? (
    //                 <TableRow>
    //                   <TableCell colSpan={6}>Loading...</TableCell>
    //                 </TableRow>
    //               ) : (
    //                 (bookingsData?.bookings || []).map((booking: any) => {
    //                   const existingJob = bookingJobMap.get(String(booking._id));
    //                   return (
    //                     <TableRow key={booking._id}>
    //                       <TableCell>
    //                         <div className="font-medium">
    //                           {booking.customerId?.name || "Customer"}
    //                         </div>
    //                         <div className="text-xs text-muted-foreground">
    //                           {booking.customerId?.phone || "-"}
    //                         </div>
    //                         {booking.leadId && (
    //                           <div className="text-xs text-muted-foreground">
    //                             Lead: {booking.leadId?.name || booking.leadId?.phone || "-"}
    //                           </div>
    //                         )}
    //                       </TableCell>
    //                       <TableCell>
    //                         <div className="font-medium">{booking.serviceType}</div>
    //                         <div className="text-xs text-muted-foreground">
    //                           {booking.subService || "-"}
    //                         </div>
    //                       </TableCell>
    //                       <TableCell>
    //                         {booking.scheduledAt
    //                           ? new Date(booking.scheduledAt).toLocaleString()
    //                           : "-"}
    //                       </TableCell>
    //                       <TableCell>
    //                         <Badge variant="secondary">{booking.status}</Badge>
    //                       </TableCell>
    //                       <TableCell>
    //                         {existingJob ? (
    //                           <div className="space-y-1">
    //                             <Badge>{existingJob.status}</Badge>
    //                             <div className="text-xs text-muted-foreground">
    //                               {existingJob.technicianId?.userId?.name ||
    //                                 existingJob.technicianId?.name ||
    //                                 "Assigned"}
    //                             </div>
    //                           </div>
    //                         ) : (
    //                           <Badge variant="outline">No job yet</Badge>
    //                         )}
    //                       </TableCell>
    //                       <TableCell>
    //                         <Button
    //                           size="sm"
    //                           onClick={() => setJobBooking(booking)}
    //                           disabled={!!existingJob}
    //                         >
    //                           {existingJob ? "Job Created" : "Create Job"}
    //                         </Button>
    //                       </TableCell>
    //                     </TableRow>
    //                   );
    //                 })
    //               )}
    //             </TableBody>
    //           </Table>
    //         </div>

    //         <div className="flex items-center justify-between">
    //           <div>Page {page}</div>
    //           <div className="flex gap-2">
    //             <Button
    //               variant="outline"
    //               disabled={page <= 1}
    //               onClick={() => setPage((p) => Math.max(1, p - 1))}
    //             >
    //               Prev
    //             </Button>
    //             <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
    //               Next
    //             </Button>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     {jobBooking && (
    //       <Card>
    //         <CardHeader>
    //           <CardTitle>Create Job for Booking</CardTitle>
    //         </CardHeader>
    //         <CardContent className="space-y-4">
    //           <div className="rounded-md border p-3 text-sm">
    //             <div>
    //               <strong>Customer:</strong> {jobBooking.customerId?.name || "Customer"}
    //             </div>
    //             <div>
    //               <strong>Service:</strong> {jobBooking.serviceType}
    //             </div>
    //             <div>
    //               <strong>Scheduled:</strong>{" "}
    //               {jobBooking.scheduledAt
    //                 ? new Date(jobBooking.scheduledAt).toLocaleString()
    //                 : "-"}
    //             </div>
    //           </div>

    //           <div>
    //             <Label>Technician</Label>
    //             <select
    //               value={jobTechnicianId}
    //               onChange={(e) => setJobTechnicianId(e.target.value)}
    //               className="w-full rounded-md border border-input bg-background px-3 py-2"
    //             >
    //               <option value="">Select technician</option>
    //               {(technicianData?.technicians || []).map((tech: any) => (
    //                 <option key={tech._id} value={tech._id}>
    //                   {tech.userId?.name || tech.userId?.email || "Technician"} — {tech.status}
    //                 </option>
    //               ))}
    //             </select>
    //           </div>

    //           <div className="flex gap-2 border-2">
    //             <Button onClick={handleCreateJob} className="bg-blue-500 text-white hover:bg-blue-600" disabled={createJob.isPending}>
    //               {createJob.isPending ? "Creating..." : "Create Job"}
    //             </Button>
    //             <Button variant="outline" onClick={() => setJobBooking(null)}>
    //               Cancel
    //             </Button>
    //           </div>

    //           <Separator />

    //           <p className="text-sm mt-8 text-yellow-800">
    //             A job will be created from this booking. If a technician is selected, the system
    //             will assign that technician and generate OTP automatically.
    //           </p>
    //         </CardContent>
    //       </Card>
    //     )}
    //   </div>
    // </div>

    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Bookings</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {stats.total}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {stats.pending}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Confirmed</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {stats.confirmed}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">With Jobs</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {stats.withJobs}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create booking section */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
              Create Booking
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Capture booking details, schedule the visit, and estimate price
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Lead
                </Label>
                <select
                  {...register("leadId")}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select lead</option>
                  {(leadsData?.leads || []).map((lead: any) => (
                    <option key={lead._id} value={lead._id}>
                      {lead.name || lead.phone || "Unnamed lead"} —{" "}
                      {lead.serviceRequested || "Service"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Customer
                </Label>
                <select
                  {...register("customerId")}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select customer</option>
                  {(customerData?.customers || []).map((customer: any) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name} — {customer.phone}
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="text-xs text-rose-600">
                    {errors.customerId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Controller
                  control={control}
                  name="serviceTypeId"
                  render={() => (
                    <PricePicker
                      items={priceData?.items || []}
                      itemType="service"
                      value={watch("serviceTypeId") || ""}
                      onChange={(item) => {
                        if (!item) return;
                        setValue("serviceTypeId", item._id);
                        setValue("serviceType", item.name);
                        setValue("estimatedPrice", String(item.price));
                      }}
                      label="Service Type"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Sub Service
                </Label>
                <Input
                  {...register("subService")}
                  placeholder="Optional"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Scheduled At
                </Label>
                <Input
                  {...register("scheduledAt")}
                  type="datetime-local"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Estimated Price
                </Label>
                <Input
                  {...register("estimatedPrice")}
                  type="number"
                  placeholder="0"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Address Line
                </Label>
                <Input
                  {...register("addressLine")}
                  placeholder="House / Street / Area"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  City
                </Label>
                <Input
                  {...register("city")}
                  placeholder="City"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  State
                </Label>
                <Input
                  {...register("state")}
                  placeholder="State"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Pincode
                </Label>
                <Input
                  {...register("pincode")}
                  placeholder="Pincode"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Notes
              </Label>
              <Input
                {...register("notes")}
                placeholder="Short booking note"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                className="h-11 rounded-xl"
              >
                Reset
              </Button>

              <Button
                type="submit"
                disabled={createBooking.isPending}
                className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700"
              >
                {createBooking.isPending ? "Saving..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bookings table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Bookings
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Manage bookings and create jobs from approved requests
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer, lead, or service..."
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <Select
                value={selectedSource}
                onValueChange={(value) =>
                  (value !== null && setSelectedSource(value)) || null
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl sm:w-44">
                  <SelectValue placeholder="Filter source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="ads">Ads</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="walkin">Walk-in</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => refetch?.()}
                variant="outline"
                className="h-11 rounded-xl"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">
                    Customer / Lead
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Service
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Schedule
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Job
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-slate-500"
                    >
                      Loading bookings...
                    </TableCell>
                  </TableRow>
                ) : filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center">
                      <div className="mx-auto max-w-sm">
                        <p className="text-base font-medium text-slate-900">
                          No bookings found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing search or source filter.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking: any) => {
                    const existingJob = bookingJobMap.get(String(booking._id));

                    return (
                      <TableRow
                        key={booking._id}
                        className="hover:bg-slate-50/70"
                      >
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {booking.customerId?.name || "Customer"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {booking.customerId?.phone || "-"}
                          </div>
                          {booking.leadId && (
                            <div className="mt-1 text-xs text-slate-500">
                              Lead:{" "}
                              {booking.leadId?.name ||
                                booking.leadId?.phone ||
                                "-"}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {booking.serviceType}
                          </div>
                          <div className="text-xs text-slate-500">
                            {booking.subService || "-"}
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-600">
                          {formatDate(booking.scheduledAt)}
                        </TableCell>

                        <TableCell>{statusBadge(booking.status)}</TableCell>

                        <TableCell>
                          {existingJob ? (
                            <div className="space-y-1">
                              {jobStatusBadge(existingJob.status)}
                              <div className="text-xs text-slate-500">
                                {existingJob.technicianId?.userId?.name ||
                                  existingJob.technicianId?.name ||
                                  "Assigned"}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="rounded-full">
                              No job yet
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => setJobBooking(booking)}
                            disabled={!!existingJob}
                            className={
                              existingJob
                                ? "rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-100"
                                : "rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                            }
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

          <Separator />

          <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-900">{page}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Job Modal */}
      <Dialog
        open={!!jobBooking}
        onOpenChange={(open) => !open && setJobBooking(null)}
      >
        <DialogContent className="max-w-2xl rounded-3xl border-slate-200 p-0">
          <div className="border-b border-slate-100 bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Create Job for Booking
              </DialogTitle>
              <DialogDescription className="text-white/75">
                Assign a technician and convert this booking into an active job.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="mt-1 font-medium text-slate-900">
                  {jobBooking?.customerId?.name || "Customer"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Service</p>
                <p className="mt-1 font-medium text-slate-900">
                  {jobBooking?.serviceType || "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Scheduled</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDate(jobBooking?.scheduledAt)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Technician
              </Label>
              <select
                value={jobTechnicianId}
                onChange={(e) => setJobTechnicianId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select technician</option>
                {(technicianData?.technicians || []).map((tech: any) => (
                  <option key={tech._id} value={tech._id}>
                    {tech.userId?.name || tech.userId?.email || "Technician"} —{" "}
                    {tech.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A job will be created from this booking. If you select a
              technician, the job will be assigned immediately.
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setJobBooking(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateJob}
              disabled={createJob.isPending}
              className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
            >
              {createJob.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminBookingsPage;
