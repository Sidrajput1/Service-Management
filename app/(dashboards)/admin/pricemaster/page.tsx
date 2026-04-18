"use client";



import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import { useCreatePriceItem, useDeletePriceItem, usePriceItem, useUpdatePriceItem } from "@/hooks/usePriceItem";
import { set } from "mongoose";

const PriceSchema = z.object({
    
  itemType: z.enum(["service", "part", "visit", "other"]),
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price must be zero or more"),
  unit: z.string().optional(),
  taxPercent: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof PriceSchema>;


function PriceMaster() {
    const [editId,setEditId] = useState< string | null>(null);

    const [showInactive,setShowInactive] = useState(false);

    const [message,setMessage] = useState<string | null>(null);

    const {data,isLoading} = usePriceItem({ showInactive });

    const createItem = useCreatePriceItem();

    const updateItem = useUpdatePriceItem();

    const deleteItem = useDeletePriceItem();

    const items = data?.items || [];

    const editingItem = useMemo( 
        () => items.find((it:any) => it._id === editId) || null,
        [items,editId]
    );

    const {register, handleSubmit,reset,setValue,formState:{errors,isSubmitting}} = useForm({
        resolver:zodResolver(PriceSchema),
        defaultValues:{
            itemType:"service",
            name: "",
      price: 0,
      unit: "",
      taxPercent: 18,
      description: "",
        }
    });

    React.useEffect(() => {
        if(editingItem){
            setValue("itemType",editingItem.itemType);
            setValue("name",editingItem.name);
            setValue("price",editingItem.price);
            setValue("unit", editingItem.unit);
            setValue("taxPercent",editingItem.taxPercent);
            setValue("description",editingItem.description);
        }
    },[editingItem,setValue]);

    async function onSubmit(values:FormValues){
        setMessage(null);

        try {
            if(editId){
                await updateItem.mutateAsync({id:editId,payload:values});
                setMessage("Price item updated successfully");
            }else{
                await createItem.mutateAsync(values);
                setMessage("Price item created successfully");
            };
            setEditId(null);
      reset({
        itemType: "service",
        name: "",
        price: 0,
        unit: "",
        taxPercent: 18,
        description: "",
      });
        } catch (error:any) {
            setMessage(error.message || "An error occurred");
        }
    };

    function handleEdit(item: any) {
    setEditId(item._id);
    setValue("itemType", item.itemType);
    setValue("name", item.name);
    setValue("price", item.price);
    setValue("unit", item.unit || "");
    setValue("taxPercent", item.taxPercent ?? 18);
    setValue("description", item.description || "");
  }

  async function handleToggleActive(item: any) {
    await updateItem.mutateAsync({
      id: item._id,
      payload: { isActive: !item.isActive },
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this price item?")) return;
    await deleteItem.mutateAsync(id);
    if (editId === id) setEditId(null);
  }

  return (
      <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Price Master</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && <Alert>{message}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Item Type</Label>
                  <select
                    {...register("itemType")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <option value="service">Service</option>
                    <option value="part">Part</option>
                    <option value="visit">Visit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label>Name</Label>
                  <Input {...register("name")} placeholder="AC Cleaning" />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label>Price</Label>
                  <Input type="number" step="0.01" {...register("price")} />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <Label>Unit</Label>
                  <Input {...register("unit")} placeholder="visit / piece / hour" />
                </div>

                <div>
                  <Label>Tax %</Label>
                  <Input type="number" step="0.01" {...register("taxPercent")} />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input {...register("description")} placeholder="Optional note" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {editId ? "Update Price Item" : "Add Price Item"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditId(null);
                    reset({
                      itemType: "service",
                      name: "",
                      price: 0,
                      unit: "",
                      taxPercent: 18,
                      description: "",
                    });
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {showInactive ? "Showing all items" : "Showing active items only"}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowInactive((v) => !v)}
              >
                {showInactive ? "Hide Inactive" : "Show Inactive"}
              </Button>
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tax %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>Loading...</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: any) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.itemType}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>₹{item.price}</TableCell>
                        <TableCell>{item.unit || "-"}</TableCell>
                        <TableCell>{item.taxPercent ?? 18}%</TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleToggleActive(item)}>
                              {item.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(item._id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>How this is used</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>• Admin sets fixed price for each service and part.</p>
            <p>• Technician can pick predefined items during job completion.</p>
            <p>• Customer sees the same price before final billing.</p>
            <p>• Invoice generation becomes fast and standardized.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PriceMaster;