"use client";

import { useCreateCustomerRequest, useCustomerMe } from '@/hooks/useCustomer';
import { usePriceItem } from '@/hooks/usePriceItem';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form';
import z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/formatter';
import { CheckCircle2, ClipboardList, Clock3, CreditCard, MapPin, Search, Sparkles, User2, Wrench } from 'lucide-react';

const BookingSchema = z.object({
 // phone:z.string(),
    priceItemId: z.string().min(1, "Please select a service"),
  addressLine: z.string().min(3, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  preferredAt: z.string().optional(),
  notes: z.string().optional(),
})

type BookingForm = z.infer<typeof BookingSchema>;

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
};

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
};

function StatChip({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {value}
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/50">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};


function CustomerBookService() {
    const router = useRouter();

    const {data:me} = useCustomerMe();

    

   // console.log("customer data",me)
    const {data:priceData} = usePriceItem();

    const createRequest = useCreateCustomerRequest();

    // const [selectedServiceId, setSelectedServiceId] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const services = priceData?.items || [];

  // const selectedService = useMemo(
  //   () => services.find((item:any) => item._id === selectedServiceId),
  //   [services,selectedServiceId]
  // );

  const {register,handleSubmit, formState:{errors,isSubmitting},setValue,control,reset,watch} = useForm<BookingForm>({
    resolver:zodResolver(BookingSchema),
    defaultValues:{
      priceItemId:"",
      addressLine:"",
      city:"",
      state:"",
      pincode:"",
      preferredAt:"",
      notes:""
    },
  });


  const selectedServiceId = watch("priceItemId");

  const selectedService = useMemo(
    () => services.find((item:any) => item._id === selectedServiceId),
    [services,selectedServiceId]
  );

  const customerName = me?.customer?.name || me?.user?.name || "";
  const customerPhone = me?.customer?.phone || me?.user?.phone || "";
  const customerEmail = me?.customer?.email || me?.user?.email || ""


  async function onSubmit(values:BookingForm){
    setSuccess(null);
    try {
      await createRequest.mutateAsync(values);
     setSuccess("Your service request has been submitted successfully.");
      toast.success("Service request submitted successfully");
      router.push('/customer')
    } catch (error:any) {
      toast.error(error?.message || "Failed to submit request");
      setSuccess(null);
    }
  }


  return (
    // <div className="min-h-screen bg-slate-100 p-6">
    //   <div className="mx-auto max-w-3xl space-y-6">
    //     <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
    //       <CardContent className="p-6">
    //         <h1 className="text-3xl font-semibold tracking-tight">Book a service</h1>
    //         <p className="mt-2 text-sm text-slate-300">
    //           Choose a predefined service and send your request to the admin team.
    //         </p>
    //       </CardContent>
    //     </Card>

    //     <Card className="rounded-3xl border-slate-200 shadow-sm">
    //       <CardHeader>
    //         <CardTitle>Service request form</CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         {success && <Alert>{success}</Alert>}

    //         <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    //           <div>
    //             <Label>Customer</Label>
    //             <Input value={me?.customer?.name || me?.user?.name || ""} disabled />
    //           </div>
    //            <div>
    //             <Label>Customer Phone number</Label>
    //             <Input  value={me?.customer?.phone || me?.user?.phone || ""} disabled />
                
    //           </div>

    //           <div>
    //             <Label>Select Service</Label>
    //             <select
    //               value={selectedServiceId}
    //               onChange={(e) => {
    //                 const id = e.target.value;
    //                 setSelectedServiceId(id);
    //                 setValue("priceItemId", id);
    //               }}
    //               className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
    //             >
    //               <option value="">Choose a service</option>
    //               {services.map((service: any) => (
    //                 <option key={service._id} value={service._id}>
    //                   {service.name} — ₹{service.price}
    //                 </option>
    //               ))}
    //             </select>
    //             {errors.priceItemId && (
    //               <p className="mt-1 text-sm text-red-500">{errors.priceItemId.message}</p>
    //             )}
    //           </div>

    //           {selectedService ? (
    //             <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //               <div className="text-sm text-slate-500">Selected service</div>
    //               <div className="mt-1 text-lg font-semibold text-slate-900">
    //                 {selectedService.name}
    //               </div>
    //               <div className="text-sm text-slate-600">Price: ₹{selectedService.price}</div>
    //             </div>
    //           ) : null}

    //           <div className="grid gap-4 md:grid-cols-2">
    //             <div>
    //               <Label>Address Line</Label>
    //               <Input {...register("addressLine")} placeholder="House / Street / Area" />
    //               {errors.addressLine && (
    //                 <p className="mt-1 text-sm text-red-500">{errors.addressLine.message}</p>
    //               )}
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
    //             <Label>Preferred Time</Label>
    //             <Input {...register("preferredAt")} type="datetime-local" />
    //           </div>

    //           <div>
    //             <Label>Notes</Label>
    //             <Input {...register("notes")} placeholder="Problem description / extra note" />
    //           </div>

    //           <Button type="submit" disabled={isSubmitting || createRequest.isPending}>
    //             {isSubmitting || createRequest.isPending ? "Submitting..." : "Submit Request"}
    //           </Button>
    //         </form>
    //       </CardContent>
    //     </Card>
    //   </div>
    // </div>
      <div className="space-y-8 bg-background text-foreground">
      {/* Hero */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border/70 bg-muted/30 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Customer booking form
                </div>

                <div className="space-y-2">
                  <h1 className="font-poppins text-3xl font-semibold tracking-tight sm:text-4xl">
                    Book a service
                  </h1>
                  <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                    Choose a service, add your address, and send your request to the team in a clean and simple flow.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatChip title="Services" value={String(services.length)} icon={ClipboardList} />
                <StatChip title="Status" value="Quick request" icon={CheckCircle2} />
                <StatChip title="Support" value="Always available" icon={Wrench} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Form */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-xl font-semibold">Service request form</CardTitle>
            <CardDescription>
              Fill in your details once, then review the service preview before submitting.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {success ? (
              <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                {success}
              </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
              <div className="space-y-4">
                <SectionTitle
                  title="Customer details"
                  description="This helps the team identify your profile quickly."
                />

                <div className="rounded-3xl border border-border bg-muted/20 p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border border-border">
                      <AvatarFallback className="bg-background text-base font-semibold text-foreground">
                        {getInitials(customerName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-foreground">
                        {customerName || "Customer"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {customerEmail || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {customerPhone || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">Account</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        Verified customer
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <SectionTitle
                  title="Choose a service"
                  description="Select the service you want from the available price list."
                />

                <Controller
                  control={control}
                  name="priceItemId"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Service</Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Choose a service</option>
                          {services.map((service: any) => (
                            <option key={service._id} value={service._id}>
                              {service.name} — ₹{service.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.priceItemId ? (
                        <p className="text-xs text-rose-600">{errors.priceItemId.message}</p>
                      ) : null}
                    </div>
                  )}
                />

                {selectedService ? (
                  <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedService.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedService.description || "Predefined service from your price master."}
                        </p>
                      </div>
                      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
                        ₹{selectedService.price}
                      </Badge>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <SectionTitle
                  title="Service location"
                  description="Where should the technician visit?"
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Address line</Label>
                    <Input
                      {...register("addressLine")}
                      placeholder="House / Street / Area"
                      className="h-11 rounded-2xl"
                    />
                    {errors.addressLine ? (
                      <p className="text-xs text-rose-600">{errors.addressLine.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">City</Label>
                    <Input
                      {...register("city")}
                      placeholder="City"
                      className="h-11 rounded-2xl"
                    />
                    {errors.city ? (
                      <p className="text-xs text-rose-600">{errors.city.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">State</Label>
                    <Input
                      {...register("state")}
                      placeholder="State"
                      className="h-11 rounded-2xl"
                    />
                    {errors.state ? (
                      <p className="text-xs text-rose-600">{errors.state.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pincode</Label>
                    <Input
                      {...register("pincode")}
                      placeholder="Pincode"
                      className="h-11 rounded-2xl"
                    />
                    {errors.pincode ? (
                      <p className="text-xs text-rose-600">{errors.pincode.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Preferred time</Label>
                    <Input
                      {...register("preferredAt")}
                      type="datetime-local"
                      className="h-11 rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <SectionTitle
                  title="Additional note"
                  description="Add a short description of the issue or any special instruction."
                />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    {...register("notes")}
                    placeholder="Problem description / extra note"
                    className="min-h-28 rounded-2xl"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    reset({
                      priceItemId: "",
                      addressLine: "",
                      city: "",
                      state: "",
                      pincode: "",
                      preferredAt: "",
                      notes: "",
                    })
                  }
                  className="h-11 rounded-2xl"
                >
                  Reset
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting || createRequest.isPending}
                  className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                >
                  {isSubmitting || createRequest.isPending ? "Submitting..." : "Submit request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/70">
              <CardTitle className="text-xl font-semibold">Live preview</CardTitle>
              <CardDescription>
                Review your request before sending it to the admin team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="rounded-3xl border border-border bg-muted/20 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background">
                    <User2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-base font-semibold text-foreground">
                      {customerName || "Customer"}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <PreviewRow label="Phone" value={customerPhone || "-"} />
                  <PreviewRow label="Email" value={customerEmail || "-"} />
                  <PreviewRow
                    label="Selected service"
                    value={selectedService?.name || "Not selected"}
                  />
                  <PreviewRow
                    label="Price"
                    value={selectedService ? `₹${selectedService.price}` : "-"}
                  />
                  <PreviewRow
                    label="Preferred time"
                    value={watch("preferredAt") ? watch("preferredAt") : "-"}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <StatChip title="Fast booking" value="Simple flow" icon={Clock3} />
                <StatChip title="Support" value="Ready to help" icon={Wrench} />
              </div>

              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Where we will go</p>
                </div>

                <div className="mt-4 space-y-3">
                  <PreviewRow label="Address line" value={watch("addressLine") || "-"} />
                  <PreviewRow label="City" value={watch("city") || "-"} />
                  <PreviewRow label="State" value={watch("state") || "-"} />
                  <PreviewRow label="Pincode" value={watch("pincode") || "-"} />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">What happens next</p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-6">
                  Your request will go to the admin team. Once approved, the booking will appear in your dashboard and you will be able to track the technician, timeline, and invoice.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CustomerBookService;