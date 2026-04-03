"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAddInvoiceItems, useCreateInvoiceFromJob, useCreatePayment, useFinalizeInvoice, useInvoices } from "@/hooks/useBillings";
import { useJobs } from "@/hooks/useJobs";


// const InvoiceSchema = z.object({
//   invoiceNumber: z.string().optional(),
//   jobId: z.string().min(1, "Job is required"),
//   discountAmount: z.coerce.number().default(0).pipe(z.number()),
//   taxPercent: z.coerce.number().default(18).pipe(z.number()),
//   notes: z.string().optional(),
//   dueDays: z.coerce.number().default(0).pipe(z.number()),
//   items: z.array(
//     z.object({
//       itemType: z.enum(["service", "part", "visit", "discount", "other"]),
//       description: z.string().min(1),
//       qty: z.coerce.number().positive().pipe(z.number()),
//       unitPrice: z.coerce.number().min(0).pipe(z.number()),
//     })
//   ).min(1, "At least one item required"),
// });

const InvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),

  jobId: z.string().min(1, "Job is required"),

  discountAmount: z.coerce.number().default(0),
  taxPercent: z.coerce.number().default(18),

  notes: z.string().optional(),

  dueDays: z.coerce.number().default(0),

  items: z
    .array(
      z.object({
        itemType: z.enum(["service", "part", "visit", "discount", "other"]),
        description: z.string().min(1),
        qty: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one item required"),
});

type InvoiceForm = z.infer<typeof InvoiceSchema>;

export default function AdminBillingPage() {
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  const { data: invoicesData, isLoading } = useInvoices(page, 20);
  const { data: jobsData } = useJobs(1, 100);
  const createInvoice = useCreateInvoiceFromJob();
  const addItems = useAddInvoiceItems();
  const finalizeInvoice = useFinalizeInvoice();
  const createPayment = useCreatePayment();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: {
      discountAmount: 0,
      taxPercent: 18,
      dueDays: 0,
      items: [
        { itemType: "service", description: "", qty: 1, unitPrice: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  async function onCreate(values: InvoiceForm) {
    await createInvoice.mutateAsync({
      jobId: values.jobId,
      discountAmount: values.discountAmount,
      taxPercent: values.taxPercent,
      notes: values.notes,
      dueDays: values.dueDays,
      items: values.items.map((item) => ({
        ...item,
        amount: item.qty * item.unitPrice,
      })),
    });
    reset();
  }

  const selectedInvoice = invoicesData?.invoices?.find((inv: any) => inv._id === selectedInvoiceId);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Create Invoice from Job</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div>
                <Label>Job</Label>
                <select
                  {...register("jobId")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="">Select completed job</option>
                  {(jobsData?.jobs || []).map((job: any) => (
                    <option key={job._id} value={job._id}>
                      {job.bookingId?.serviceType || "Service"} — {job.bookingId?.customerId?.name || "Customer"} — {job.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Discount Amount</Label>
                  <Input type="number" step="0.01" {...register("discountAmount")} />
                </div>
                <div>
                  <Label>Tax %</Label>
                  <Input type="number" step="0.01" {...register("taxPercent")} />
                </div>
                <div>
                  <Label>Due Days</Label>
                  <Input type="number" {...register("dueDays")} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Input {...register("notes")} placeholder="Invoice note" />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Invoice Items</div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ itemType: "service", description: "", qty: 1, unitPrice: 0 })}
                  >
                    Add Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
                    <div>
                      <Label>Type</Label>
                      <select
                        {...register(`items.${index}.itemType` as const)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <option value="service">Service</option>
                        <option value="part">Part</option>
                        <option value="visit">Visit</option>
                        <option value="discount">Discount</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Input {...register(`items.${index}.description` as const)} placeholder="Item description" />
                    </div>
                    <div>
                      <Label>Qty</Label>
                      <Input type="number" {...register(`items.${index}.qty` as const)} />
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.unitPrice` as const)} />
                    </div>

                    <div className="md:col-span-5">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        Remove Item
                      </Button>
                    </div>
                  </div>
                ))}

                {errors.items && (
                  <p className="text-sm text-red-500">{String(errors.items.message || "Item validation error")}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>Loading...</TableCell>
                    </TableRow>
                  ) : (
                    (invoicesData?.invoices || []).map((invoice: any) => (
                      <TableRow key={invoice._id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customerId?.name || "-"}</TableCell>
                        <TableCell>₹{invoice.grandTotal}</TableCell>
                        <TableCell>₹{invoice.amountPaid}</TableCell>
                        <TableCell>₹{invoice.balanceDue}</TableCell>
                        <TableCell>
                          <Badge>{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedInvoiceId(invoice._id)}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div>Page {page}</div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedInvoice && (
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Info label="Invoice" value={selectedInvoice.invoiceNumber} />
                <Info label="Total" value={`₹${selectedInvoice.grandTotal}`} />
                <Info label="Paid" value={`₹${selectedInvoice.amountPaid}`} />
                <Info label="Due" value={`₹${selectedInvoice.balanceDue}`} />
              </div>

              <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedInvoice.items || []).map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.itemType}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>₹{item.unitPrice}</TableCell>
                        <TableCell>₹{item.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => finalizeInvoice.mutate(selectedInvoice._id)}>
                  Finalize Invoice
                </Button>
              </div>

              <Separator />

              <PaymentBox invoiceId={selectedInvoice._id} createPayment={createPayment} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PaymentBox({
  invoiceId,
  createPayment,
}: {
  invoiceId: string;
  createPayment: any;
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("upi");
  const [note, setNote] = useState("");

  async function submitPayment() {
    if (!amount) return;
    await createPayment.mutateAsync({
      invoiceId,
      amount: Number(amount),
      mode,
      note,
      status: "success",
    });
    setAmount("");
    setNote("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="font-medium">Record Payment</div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Amount</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
        </div>
        <div>
          <Label>Mode</Label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="wallet">Wallet</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label>Note</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <Button onClick={submitPayment}>Save Payment</Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-900">{value}</div>
    </div>
  );
}