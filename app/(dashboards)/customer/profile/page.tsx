"use client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomerMe, useUpdateCustomerProfile } from '@/hooks/useCustomer';
import React from 'react'
import { useForm } from 'react-hook-form';

function CustomerProfile() {

    const {data,isLoading} = useCustomerMe();
    const updateProfile = useUpdateCustomerProfile();

    const customer = data?.customer;

    const {register,handleSubmit,reset} = useForm({
        values:{
            name:customer?.name || "",
            phone:customer?.phone || "",
            email: customer?.email || "",
      addressLine: customer?.addresses?.[0]?.addressLine || "",
      city: customer?.addresses?.[0]?.city || "",
      state: customer?.addresses?.[0]?.state || "",
      pincode: customer?.addresses?.[0]?.pincode || ""
        }
    });

    async function onSubmit(values:any){
        await updateProfile.mutateAsync({
            name: values.name,
      phone: values.phone,
      email: values.email,
      addresses: [
        {
          label: "Primary",
          addressLine: values.addressLine,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
        },
      ],
        })
    }
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
            <p className="mt-2 text-sm text-slate-300">
              Update your contact and address details.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input {...register("name")} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register("phone")} />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register("email")} />
              </div>

              <div>
                <Label>Address Line</Label>
                <Input {...register("addressLine")} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>City</Label>
                  <Input {...register("city")} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input {...register("state")} />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input {...register("pincode")} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={updateProfile.isPending}>
                  Save Profile
                </Button>
                <Button type="button" variant="outline" onClick={() => reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CustomerProfile