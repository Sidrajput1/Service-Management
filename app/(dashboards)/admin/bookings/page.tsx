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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  Home,
  Inbox,
  Loader2,
  MapPin,
  MoreHorizontal,
  RefreshCcw,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";


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

function formatDate(date?: string | Date | null) {
  if(!date) return "-";
  try {
    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function getInitials(name ?: string){
  if(!name) return "B";

  return name
      .split(" ")
      .filter(Boolean)
      .slice(0,2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
};

function BookingTableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-6 gap-3 rounded-2xl border border-border bg-card px-4 py-4"
        >
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
};

function BookingPreviewCard({
  values,
  leadLabel,
  customerLabel,
}: {
  values: BookingForm;
  leadLabel: string;
  customerLabel: string;
}) {
  return (
    <Card className="h-full border-border bg-card/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Live preview
        </CardTitle>
        <CardDescription>
          Review the booking before saving it.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-border bg-muted/30 p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarFallback className="bg-background text-sm font-semibold text-foreground">
                {getInitials(customerLabel !== "-" ? customerLabel : leadLabel)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">
                {customerLabel !== "-" ? customerLabel : leadLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {values.serviceType || "Service type"}{" "}
                {values.subService ? `• ${values.subService}` : ""}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Schedule</span>
              <span className="font-medium text-foreground">
                {values.scheduledAt ? formatDate(values.scheduledAt) : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Estimated price</span>
              <span className="font-medium text-foreground">
                {values.estimatedPrice ? `₹${values.estimatedPrice}` : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium text-foreground">
                {values.city || values.state ? `${values.city || ""}${values.city && values.state ? ", " : ""}${values.state || ""}` : "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Flow</p>
            <p className="mt-1 text-sm font-medium text-foreground">Booking → Job</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Focus</p>
            <p className="mt-1 text-sm font-medium text-foreground">Operations</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Style</p>
            <p className="mt-1 text-sm font-medium text-foreground">Premium UI</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-background p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">What happens next</p>
              <p className="mt-1 text-sm text-muted-foreground">
                After this booking is created, you can convert it into a job, assign a technician, and track execution.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


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
    defaultValues:{
       leadId: "",
      customerId: "",
      serviceType: "",
      subService: "",
      scheduledAt: "",
      estimatedPrice: "",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      notes: "",
      serviceTypeId: "",
    } as any,
    
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

  const watchedValues = watch();

  const leadLable = useMemo(() => {
      const selected = (leadsData?.leads || []).find(
         (lead: any) => String(lead._id) === String(watchedValues.leadId || ""),
      );

       return selected ? selected.name || selected.phone || "Lead" : "Lead";
  },[leadsData?.leads,watchedValues.leadId]);


  const customerLabel = useMemo(() => {
    const selected = (customerData?.customers || []).find(
      (customer: any) => String(customer._id) === String(watchedValues.customerId || ""),
    );
    return selected ? selected.name || selected.phone || "Customer" : "Customer";
  }, [customerData?.customers, watchedValues.customerId]);

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
    
    // <div className="space-y-6">
    //   {/* Summary cards */}
    //   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
    //           <CalendarDays className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">Total Bookings</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.total}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
    //           <Sparkles className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">Pending</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.pending}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
    //           <CheckCircle2 className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">Confirmed</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.confirmed}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <Card className="border-slate-200 shadow-sm">
    //       <CardContent className="flex items-center gap-4 p-5">
    //         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
    //           <ClipboardList className="h-5 w-5" />
    //         </div>
    //         <div>
    //           <p className="text-sm text-slate-500">With Jobs</p>
    //           <p className="text-2xl font-semibold tracking-tight text-slate-900">
    //             {stats.withJobs}
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>
    //   </div>

    //   {/* Create booking section */}
    //   <Card className="border-slate-200 shadow-sm">
    //     <CardHeader className="border-b border-slate-100">
    //       <div>
    //         <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
    //           Create Booking
    //         </CardTitle>
    //         <p className="mt-1 text-sm text-slate-500">
    //           Capture booking details, schedule the visit, and estimate price
    //         </p>
    //       </div>
    //     </CardHeader>

    //     <CardContent className="pt-6">
    //       <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
    //         <div className="grid gap-4 md:grid-cols-2">
    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               Lead
    //             </Label>
    //             <select
    //               {...register("leadId")}
    //               className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    //             >
    //               <option value="">Select lead</option>
    //               {(leadsData?.leads || []).map((lead: any) => (
    //                 <option key={lead._id} value={lead._id}>
    //                   {lead.name || lead.phone || "Unnamed lead"} —{" "}
    //                   {lead.serviceRequested || "Service"}
    //                 </option>
    //               ))}
    //             </select>
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               Customer
    //             </Label>
    //             <select
    //               {...register("customerId")}
    //               className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    //             >
    //               <option value="">Select customer</option>
    //               {(customerData?.customers || []).map((customer: any) => (
    //                 <option key={customer._id} value={customer._id}>
    //                   {customer.name} — {customer.phone}
    //                 </option>
    //               ))}
    //             </select>
    //             {errors.customerId && (
    //               <p className="text-xs text-rose-600">
    //                 {errors.customerId.message}
    //               </p>
    //             )}
    //           </div>

    //           <div className="space-y-2 md:col-span-2">
    //             <Controller
    //               control={control}
    //               name="serviceTypeId"
    //               render={() => (
    //                 <PricePicker
    //                   items={priceData?.items || []}
    //                   itemType="service"
    //                   value={watch("serviceTypeId") || ""}
    //                   onChange={(item) => {
    //                     if (!item) return;
    //                     setValue("serviceTypeId", item._id);
    //                     setValue("serviceType", item.name);
    //                     setValue("estimatedPrice", String(item.price));
    //                   }}
    //                   label="Service Type"
    //                 />
    //               )}
    //             />
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               Sub Service
    //             </Label>
    //             <Input
    //               {...register("subService")}
    //               placeholder="Optional"
    //               className="h-11 rounded-xl"
    //             />
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               Scheduled At
    //             </Label>
    //             <Input
    //               {...register("scheduledAt")}
    //               type="datetime-local"
    //               className="h-11 rounded-xl"
    //             />
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               Estimated Price
    //             </Label>
    //             <Input
    //               {...register("estimatedPrice")}
    //               type="number"
    //               placeholder="0"
    //               className="h-11 rounded-xl"
    //             />
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               Address Line
    //             </Label>
    //             <Input
    //               {...register("addressLine")}
    //               placeholder="House / Street / Area"
    //               className="h-11 rounded-xl"
    //             />
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               City
    //             </Label>
    //             <Input
    //               {...register("city")}
    //               placeholder="City"
    //               className="h-11 rounded-xl"
    //             />
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               State
    //             </Label>
    //             <Input
    //               {...register("state")}
    //               placeholder="State"
    //               className="h-11 rounded-xl"
    //             />
    //           </div>

    //           <div className="space-y-2">
    //             <Label className="text-sm font-medium text-slate-700">
    //               Pincode
    //             </Label>
    //             <Input
    //               {...register("pincode")}
    //               placeholder="Pincode"
    //               className="h-11 rounded-xl"
    //             />
    //           </div>
    //         </div>

    //         <div className="space-y-2">
    //           <Label className="text-sm font-medium text-slate-700">
    //             Notes
    //           </Label>
    //           <Input
    //             {...register("notes")}
    //             placeholder="Short booking note"
    //             className="h-11 rounded-xl"
    //           />
    //         </div>

    //         <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
    //           <Button
    //             type="button"
    //             variant="outline"
    //             onClick={() => reset()}
    //             className="h-11 rounded-xl"
    //           >
    //             Reset
    //           </Button>

    //           <Button
    //             type="submit"
    //             disabled={createBooking.isPending}
    //             className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700"
    //           >
    //             {createBooking.isPending ? "Saving..." : "Create Booking"}
    //           </Button>
    //         </div>
    //       </form>
    //     </CardContent>
    //   </Card>

    //   {/* Bookings table */}
    //   <Card className="border-slate-200 shadow-sm">
    //     <CardHeader className="border-b border-slate-100">
    //       <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    //         <div>
    //           <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
    //             Bookings
    //           </CardTitle>
    //           <p className="mt-1 text-sm text-slate-500">
    //             Manage bookings and create jobs from approved requests
    //           </p>
    //         </div>

    //         <div className="flex flex-col gap-3 sm:flex-row">
    //           <div className="relative w-full sm:w-80">
    //             <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    //             <Input
    //               value={search}
    //               onChange={(e) => setSearch(e.target.value)}
    //               placeholder="Search by customer, lead, or service..."
    //               className="h-11 rounded-xl pl-10"
    //             />
    //           </div>

    //           <Select
    //             value={selectedSource}
    //             onValueChange={(value) =>
    //               (value !== null && setSelectedSource(value)) || null
    //             }
    //           >
    //             <SelectTrigger className="h-11 w-full rounded-xl sm:w-44">
    //               <SelectValue placeholder="Filter source" />
    //             </SelectTrigger>
    //             <SelectContent>
    //               <SelectItem value="all">All</SelectItem>
    //               <SelectItem value="website">Website</SelectItem>
    //               <SelectItem value="whatsapp">WhatsApp</SelectItem>
    //               <SelectItem value="ads">Ads</SelectItem>
    //               <SelectItem value="call">Call</SelectItem>
    //               <SelectItem value="walkin">Walk-in</SelectItem>
    //               <SelectItem value="referral">Referral</SelectItem>
    //             </SelectContent>
    //           </Select>

    //           <Button
    //             onClick={() => refetch?.()}
    //             variant="outline"
    //             className="h-11 rounded-xl"
    //           >
    //             Refresh
    //           </Button>
    //         </div>
    //       </div>
    //     </CardHeader>

    //     <CardContent className="p-0">
    //       <div className="overflow-x-auto">
    //         <Table>
    //           <TableHeader className="bg-slate-50">
    //             <TableRow>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Customer / Lead
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Service
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Schedule
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Status
    //               </TableHead>
    //               <TableHead className="font-semibold text-slate-600">
    //                 Job
    //               </TableHead>
    //               <TableHead className="text-right font-semibold text-slate-600">
    //                 Action
    //               </TableHead>
    //             </TableRow>
    //           </TableHeader>

    //           <TableBody>
    //             {isLoading ? (
    //               <TableRow>
    //                 <TableCell
    //                   colSpan={6}
    //                   className="py-10 text-center text-slate-500"
    //                 >
    //                   Loading bookings...
    //                 </TableCell>
    //               </TableRow>
    //             ) : filteredBookings.length === 0 ? (
    //               <TableRow>
    //                 <TableCell colSpan={6} className="py-14 text-center">
    //                   <div className="mx-auto max-w-sm">
    //                     <p className="text-base font-medium text-slate-900">
    //                       No bookings found
    //                     </p>
    //                     <p className="mt-1 text-sm text-slate-500">
    //                       Try changing search or source filter.
    //                     </p>
    //                   </div>
    //                 </TableCell>
    //               </TableRow>
    //             ) : (
    //               filteredBookings.map((booking: any) => {
    //                 const existingJob = bookingJobMap.get(String(booking._id));

    //                 return (
    //                   <TableRow
    //                     key={booking._id}
    //                     className="hover:bg-slate-50/70"
    //                   >
    //                     <TableCell>
    //                       <div className="font-medium text-slate-900">
    //                         {booking.customerId?.name || "Customer"}
    //                       </div>
    //                       <div className="text-xs text-slate-500">
    //                         {booking.customerId?.phone || "-"}
    //                       </div>
    //                       {booking.leadId && (
    //                         <div className="mt-1 text-xs text-slate-500">
    //                           Lead:{" "}
    //                           {booking.leadId?.name ||
    //                             booking.leadId?.phone ||
    //                             "-"}
    //                         </div>
    //                       )}
    //                     </TableCell>

    //                     <TableCell>
    //                       <div className="font-medium text-slate-900">
    //                         {booking.serviceType}
    //                       </div>
    //                       <div className="text-xs text-slate-500">
    //                         {booking.subService || "-"}
    //                       </div>
    //                     </TableCell>

    //                     <TableCell className="text-slate-600">
    //                       {formatDate(booking.scheduledAt)}
    //                     </TableCell>

    //                     <TableCell>{statusBadge(booking.status)}</TableCell>

    //                     <TableCell>
    //                       {existingJob ? (
    //                         <div className="space-y-1">
    //                           {jobStatusBadge(existingJob.status)}
    //                           <div className="text-xs text-slate-500">
    //                             {existingJob.technicianId?.userId?.name ||
    //                               existingJob.technicianId?.name ||
    //                               "Assigned"}
    //                           </div>
    //                         </div>
    //                       ) : (
    //                         <Badge variant="outline" className="rounded-full">
    //                           No job yet
    //                         </Badge>
    //                       )}
    //                     </TableCell>

    //                     <TableCell className="text-right">
    //                       <Button
    //                         size="sm"
    //                         onClick={() => setJobBooking(booking)}
    //                         disabled={!!existingJob}
    //                         className={
    //                           existingJob
    //                             ? "rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-100"
    //                             : "rounded-xl bg-slate-900 text-white hover:bg-slate-800"
    //                         }
    //                       >
    //                         {existingJob ? "Job Created" : "Create Job"}
    //                       </Button>
    //                     </TableCell>
    //                   </TableRow>
    //                 );
    //               })
    //             )}
    //           </TableBody>
    //         </Table>
    //       </div>

    //       <Separator />

    //       <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
    //         <div className="text-sm text-slate-500">
    //           Page <span className="font-medium text-slate-900">{page}</span>
    //         </div>

    //         <div className="flex gap-2">
    //           <Button
    //             variant="outline"
    //             disabled={page <= 1}
    //             onClick={() => setPage((p) => Math.max(1, p - 1))}
    //             className="rounded-xl"
    //           >
    //             Prev
    //           </Button>
    //           <Button
    //             variant="outline"
    //             onClick={() => setPage((p) => p + 1)}
    //             className="rounded-xl"
    //           >
    //             Next
    //           </Button>
    //         </div>
    //       </div>
    //     </CardContent>
    //   </Card>

    //   {/* Create Job Modal */}
    //   <Dialog
    //     open={!!jobBooking}
    //     onOpenChange={(open) => !open && setJobBooking(null)}
    //   >
    //     <DialogContent className="max-w-2xl rounded-3xl border-slate-200 p-0">
    //       <div className="border-b border-slate-100 bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
    //         <DialogHeader>
    //           <DialogTitle className="text-xl font-semibold">
    //             Create Job for Booking
    //           </DialogTitle>
    //           <DialogDescription className="text-white/75">
    //             Assign a technician and convert this booking into an active job.
    //           </DialogDescription>
    //         </DialogHeader>
    //       </div>

    //       <div className="space-y-6 px-6 py-6">
    //         <div className="grid gap-4 md:grid-cols-3">
    //           <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //             <p className="text-xs text-slate-500">Customer</p>
    //             <p className="mt-1 font-medium text-slate-900">
    //               {jobBooking?.customerId?.name || "Customer"}
    //             </p>
    //           </div>
    //           <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //             <p className="text-xs text-slate-500">Service</p>
    //             <p className="mt-1 font-medium text-slate-900">
    //               {jobBooking?.serviceType || "-"}
    //             </p>
    //           </div>
    //           <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //             <p className="text-xs text-slate-500">Scheduled</p>
    //             <p className="mt-1 font-medium text-slate-900">
    //               {formatDate(jobBooking?.scheduledAt)}
    //             </p>
    //           </div>
    //         </div>

    //         <div className="space-y-2">
    //           <Label className="text-sm font-medium text-slate-700">
    //             Technician
    //           </Label>
    //           <select
    //             value={jobTechnicianId}
    //             onChange={(e) => setJobTechnicianId(e.target.value)}
    //             className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    //           >
    //             <option value="">Select technician</option>
    //             {(technicianData?.technicians || []).map((tech: any) => (
    //               <option key={tech._id} value={tech._id}>
    //                 {tech.userId?.name || tech.userId?.email || "Technician"} —{" "}
    //                 {tech.status}
    //               </option>
    //             ))}
    //           </select>
    //         </div>

    //         <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    //           A job will be created from this booking. If you select a
    //           technician, the job will be assigned immediately.
    //         </div>
    //       </div>

    //       <DialogFooter className="border-t border-slate-100 px-6 py-4">
    //         <Button
    //           variant="outline"
    //           onClick={() => setJobBooking(null)}
    //           className="rounded-xl"
    //         >
    //           Cancel
    //         </Button>
    //         <Button
    //           onClick={handleCreateJob}
    //           disabled={createJob.isPending}
    //           className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
    //         >
    //           {createJob.isPending ? (
    //             <>
    //               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    //               Creating...
    //             </>
    //           ) : (
    //             "Create Job"
    //           )}
    //         </Button>
    //       </DialogFooter>
    //     </DialogContent>
    //   </Dialog>
    // </div>

    <div className="space-y-8 bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Booking workspace
          </div>
          <div>
            <h1 className="font-poppins text-3xl font-semibold tracking-tight">
              Bookings
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Create bookings, schedule services, and convert confirmed work into jobs from one clean workspace.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Current bookings</p>
            <p className="mt-1 text-lg font-semibold">{stats.total}</p>
          </div>
          <Button variant="outline" onClick={() => refetch?.()} className="h-11 rounded-2xl">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Total bookings</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Live
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.total}</p>
              <p className="mt-1 text-sm text-muted-foreground">All bookings currently loaded from the API.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Pending</p>
                <span className="text-xs font-medium text-muted-foreground">Needs action</span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.pending}</p>
              <p className="mt-1 text-sm text-muted-foreground">Bookings waiting for confirmation or allocation.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <span className="text-xs font-medium text-muted-foreground">Ready to execute</span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.confirmed}</p>
              <p className="mt-1 text-sm text-muted-foreground">Confirmed bookings ready to become jobs.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <Home className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">With jobs</p>
                <span className="text-xs font-medium text-muted-foreground">In execution</span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.withJobs}</p>
              <p className="mt-1 text-sm text-muted-foreground">Bookings already converted to live jobs.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create booking section */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-2 border-b border-border/70">
          <CardTitle className="text-xl font-semibold">Create booking</CardTitle>
          <CardDescription>
            Capture service, scheduling, and address details in a structured workspace form.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-border/70 p-6 lg:border-b-0 lg:border-r lg:p-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Customer selection</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Link the booking to either a lead or an existing customer.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Lead</Label>
                      <select
                        {...register("leadId")}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select lead</option>
                        {(leadsData?.leads || []).map((lead: any) => (
                          <option key={lead._id} value={lead._id}>
                            {lead.name || lead.phone || "Unnamed lead"} — {lead.serviceRequested || "Service"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Customer</Label>
                      <select
                        {...register("customerId")}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select customer</option>
                        {(customerData?.customers || []).map((customer: any) => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name} — {customer.phone}
                          </option>
                        ))}
                      </select>
                      {errors.customerId && (
                        <p className="text-xs text-rose-600">{errors.customerId.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Service details</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select a service item or type the service manually if needed.
                    </p>
                  </div>

                  <div className="space-y-4 ">
                    <Controller
                      control={control}
                      name="serviceTypeId"
                      render={() => (
                        <PricePicker
                          items={priceData?.items || []}
                          itemType="service"
                          value={watch("serviceTypeId") || ""}
                          onChange={(item: any) => {
                            if (!item) return;
                            setValue("serviceTypeId", item._id);
                            setValue("serviceType", item.name);
                            setValue("estimatedPrice", String(item.price));
                          }}
                          label="Service Type"
                        />
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Sub Service</Label>
                        <Input {...register("subService")} placeholder="Optional" className="h-11 rounded-2xl" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Scheduled At</Label>
                        <Input
                          {...register("scheduledAt")}
                          type="datetime-local"
                          className="h-11 rounded-2xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Estimated Price</Label>
                        <Input
                          {...register("estimatedPrice")}
                          type="number"
                          placeholder="0"
                          className="h-11 rounded-2xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Address Line</Label>
                        <Input
                          {...register("addressLine")}
                          placeholder="House / Street / Area"
                          className="h-11 rounded-2xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">City</Label>
                        <Input {...register("city")} placeholder="City" className="h-11 rounded-2xl" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">State</Label>
                        <Input {...register("state")} placeholder="State" className="h-11 rounded-2xl" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Pincode</Label>
                        <Input {...register("pincode")} placeholder="Pincode" className="h-11 rounded-2xl" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">Notes</Label>
                        <Textarea
                          {...register("notes")}
                          placeholder="Short booking note"
                          className="min-h-30 rounded-2xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      reset({
                        leadId: "",
                        customerId: "",
                        serviceType: "",
                        subService: "",
                        scheduledAt: "",
                        estimatedPrice: "",
                        addressLine: "",
                        city: "",
                        state: "",
                        pincode: "",
                        notes: "",
                        serviceTypeId: "",
                      } as any)
                    }
                    className="h-11 rounded-2xl"
                  >
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    disabled={createBooking.isPending}
                    className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  >
                    {createBooking.isPending ? "Saving..." : "Create booking"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="p-6 lg:p-7">
              <BookingPreviewCard
                values={watchedValues}
                leadLabel={leadLable}
                customerLabel={customerLabel}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Bookings list</CardTitle>
              <CardDescription>
                Search and manage bookings before converting them into jobs.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by customer, lead, or service..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>

              <Select value={selectedSource} onValueChange={(value) => setSelectedSource(value ?? "all")}>
                <SelectTrigger className="h-11 w-full rounded-2xl sm:w-44">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              All
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              Pending
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              Confirmed
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
              With Jobs
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <BookingTableSkeleton />
          ) : filteredBookings.length === 0 ? (
            <div className="flex min-h-80 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50">
                  <Inbox className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No bookings found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try changing the search term or source filter.
                </p>
                <Button
                  className="mt-5 h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                  onClick={() => {
                    setSelectedSource("all");
                    setSearch("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-muted-foreground">Customer / Lead</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Service</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Schedule</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Job</TableHead>
                      <TableHead className="text-right font-medium text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredBookings.map((booking: any) => {
                      const existingJob = bookingJobMap.get(String(booking._id));

                      return (
                        <TableRow key={booking._id} className="group hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border">
                                <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                                  {getInitials(
                                    booking.customerId?.name ||
                                      booking.leadId?.name ||
                                      "Booking",
                                  )}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {booking.customerId?.name || "Customer"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {booking.customerId?.phone || "-"}
                                </p>
                                {booking.leadId && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    Lead:{" "}
                                    {booking.leadId?.name ||
                                      booking.leadId?.phone ||
                                      "-"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {booking.serviceType || "-"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{booking.subService || "No sub-service"}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(booking.scheduledAt)}
                          </TableCell>

                          <TableCell>{statusBadge(booking.status)}</TableCell>

                          <TableCell>
                            {existingJob ? (
                              <div className="space-y-1">
                                {jobStatusBadge(existingJob.status)}
                                <div className="text-xs text-muted-foreground">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 rounded-2xl">
                                <DropdownMenuItem
                                  onClick={() => setJobBooking(booking)}
                                  className="rounded-xl"
                                  disabled={!!existingJob}
                                >
                                  <ClipboardList className="mr-2 h-4 w-4" />
                                  {existingJob ? "Job Created" : "Create Job"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Page <span className="font-medium text-foreground">{page}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-2xl"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-2xl"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create job dialog */}
      <Dialog open={!!jobBooking} onOpenChange={(open) => !open && setJobBooking(null)}>
        <DialogContent className="max-w-2xl rounded-3xl border-border p-0">
          <div className="border-b border-border/70 bg-linear-to-r from-slate-900 to-slate-700 px-6 py-5 text-white dark:from-white dark:to-slate-200 dark:text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Create Job for Booking
              </DialogTitle>
              <DialogDescription className="text-white/70 dark:text-slate-600">
                Assign a technician and convert this booking into a job.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="mt-1 font-medium text-foreground">
                  {jobBooking?.customerId?.name || "Customer"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Service</p>
                <p className="mt-1 font-medium text-foreground">
                  {jobBooking?.serviceType || "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="mt-1 font-medium text-foreground">
                  {formatDate(jobBooking?.scheduledAt)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Technician</Label>
              <select
                value={jobTechnicianId}
                onChange={(e) => setJobTechnicianId(e.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select technician</option>
                {(technicianData?.technicians || []).map((tech: any) => (
                  <option key={tech._id} value={tech._id}>
                    {tech.userId?.name || tech.userId?.email || "Technician"} — {tech.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              A job will be created from this booking. If you select a technician, the job will be assigned immediately.
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 px-6 py-4">
            <Button variant="outline" onClick={() => setJobBooking(null)} className="rounded-2xl">
              Cancel
            </Button>
            <Button
              onClick={handleCreateJob}
              disabled={createJob.isPending}
              className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
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
