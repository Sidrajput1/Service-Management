"use client";

import { useCreateCustomerRequest, useCustomerMe } from '@/hooks/useCustomer';
import { usePriceItem } from '@/hooks/usePriceItem';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

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

function CustomerBookService() {
    const router = useRouter();

    const {data:me} = useCustomerMe();

    console.log("customer data",me)
    const {data:priceData} = usePriceItem();

    const createRequest = useCreateCustomerRequest();

     const [selectedServiceId, setSelectedServiceId] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const services = priceData?.items || [];

  const selectedService = useMemo(
    () => services.find((item:any) => item._id === selectedServiceId),
    [services,selectedServiceId]
  );

  const {register,handleSubmit, formState:{errors,isSubmitting},setValue} = useForm<BookingForm>({
    resolver:zodResolver(BookingSchema)
  });

  async function onSubmit(values:BookingForm){
    setSuccess(null);
    try {
      await createRequest.mutateAsync(values);
     setSuccess("Your service request has been submitted successfully.");
      router.push('/customer')
    } catch (error:any) {
      setSuccess(null);
    }
  }


  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">Book a service</h1>
            <p className="mt-2 text-sm text-slate-300">
              Choose a predefined service and send your request to the admin team.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Service request form</CardTitle>
          </CardHeader>
          <CardContent>
            {success && <Alert>{success}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Input value={me?.customer?.name || me?.user?.name || ""} disabled />
              </div>
               <div>
                <Label>Customer Phone number</Label>
                <Input  value={me?.customer?.phone || me?.user?.phone || ""} disabled />
                {/* <Input {...register("phone")} placeholder="enter number" />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                  )} */}
              </div>

              <div>
                <Label>Select Service</Label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedServiceId(id);
                    setValue("priceItemId", id);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="">Choose a service</option>
                  {services.map((service: any) => (
                    <option key={service._id} value={service._id}>
                      {service.name} — ₹{service.price}
                    </option>
                  ))}
                </select>
                {errors.priceItemId && (
                  <p className="mt-1 text-sm text-red-500">{errors.priceItemId.message}</p>
                )}
              </div>

              {selectedService ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Selected service</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedService.name}
                  </div>
                  <div className="text-sm text-slate-600">Price: ₹{selectedService.price}</div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Address Line</Label>
                  <Input {...register("addressLine")} placeholder="House / Street / Area" />
                  {errors.addressLine && (
                    <p className="mt-1 text-sm text-red-500">{errors.addressLine.message}</p>
                  )}
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
                <Label>Preferred Time</Label>
                <Input {...register("preferredAt")} type="datetime-local" />
              </div>

              <div>
                <Label>Notes</Label>
                <Input {...register("notes")} placeholder="Problem description / extra note" />
              </div>

              <Button type="submit" disabled={isSubmitting || createRequest.isPending}>
                {isSubmitting || createRequest.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CustomerBookService;