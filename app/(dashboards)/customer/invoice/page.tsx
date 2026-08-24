"use client";

import { useCustomerInvoice } from '@/hooks/useCustomer';
import React, { useState } from 'react'
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Clock3, FileText, IndianRupee, Receipt, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// function CustomerInvoice() {

//     const {data,isLoading} = useCustomerInvoice();
//     const invoices = data?.invoices || [];
//   return (
//     <div className="min-h-screen bg-slate-100 p-6">
//       <div className="mx-auto max-w-6xl space-y-6">
//         <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
//           <CardContent className="p-6">
//             <h1 className="text-3xl font-semibold tracking-tight">My Invoices</h1>
//             <p className="mt-2 text-sm text-slate-300">
//               View bills, payment status, and download or pay invoices.
//             </p>
//           </CardContent>
//         </Card>

//         <Card className="rounded-3xl border-slate-200 shadow-sm">
//           <CardHeader>
//             <CardTitle>Invoices list</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             {isLoading ? (
//               <div className="text-sm text-slate-500">Loading...</div>
//             ) : invoices.length === 0 ? (
//               <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
//                 No invoices yet.
//               </div>
//             ) : (
//               invoices.map((invoice: any) => (
//                 <Link
//                   key={invoice._id}
//                   href={`/customer/invoice/${invoice._id}`}
//                   className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
//                 >
//                   <div className="flex items-start justify-between gap-3">
//                     <div>
//                       <div className="font-medium text-slate-900">
//                         {invoice.invoiceNumber}
//                       </div>
//                       <div className="mt-1 text-sm text-slate-500">
//                         ₹{invoice.grandTotal} • Due ₹{invoice.balanceDue}
//                       </div>
//                     </div>
//                     <Badge>{invoice.status}</Badge>
//                   </div>
//                 </Link>
//               ))
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }

// export default CustomerInvoice


function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getStatusStyles(status: string) {
  switch (status?.toLowerCase()) {
    case "paid":
      return {
        badge:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        icon:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      };

    case "partial":
      return {
        badge:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        icon:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };

    case "issued":
      return {
        badge:
          "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
        icon:
          "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      };

    case "cancelled":
      return {
        badge:
          "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        icon:
          "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      };

    default:
      return {
        badge:
          "border-border bg-muted text-muted-foreground",
        icon:
          "bg-muted text-muted-foreground",
      };
  }
}

function CustomerInvoice() {
  const { data, isLoading, isError } =
    useCustomerInvoice();

  const invoices = data?.invoices || [];

  const [search, setSearch] = useState("");

  const filteredInvoices = invoices.filter(
    (invoice: any) => {
      const query = search.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return (
        invoice.invoiceNumber
          ?.toLowerCase()
          .includes(query) ||
        invoice.customerId?.name
          ?.toLowerCase()
          .includes(query) ||
        invoice.bookingId?.serviceType
          ?.toLowerCase()
          .includes(query)
      );
    },
  );

  const totalInvoices = invoices.length;

  const paidInvoices = invoices.filter(
    (invoice: any) =>
      invoice.status === "paid",
  ).length;

  const pendingInvoices = invoices.filter(
    (invoice: any) =>
      Number(invoice.balanceDue || 0) > 0 &&
      invoice.status !== "cancelled",
  ).length;

  const totalDue = invoices.reduce(
    (sum: number, invoice: any) =>
      sum + Number(invoice.balanceDue || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm">
          <CardContent className="relative p-6 sm:p-8">

            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-coral/10 blur-3xl" />

            <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-brand-teal/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <Badge className="mb-3 rounded-full border-brand-coral/20 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/10">
                  <Receipt className="mr-1.5 h-3.5 w-3.5" />
                  Billing center
                </Badge>

                <h1 className="font-poppins text-3xl font-semibold tracking-tight text-foreground">
                  My invoices
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  View your service bills, check payment status,
                  and securely pay any outstanding balance.
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                className="rounded-2xl"
              >
                <Link href="/customer/bookings">
                  View bookings
                  <ArrowRight className="ml-2 h-4 w-4 inline" />
                </Link>
              </Button>

            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <InvoiceStat
            label="Total invoices"
            value={totalInvoices}
            icon={
              <FileText className="h-5 w-5" />
            }
            tone="coral"
          />

          <InvoiceStat
            label="Paid"
            value={paidInvoices}
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            tone="emerald"
          />

          <InvoiceStat
            label="Payment due"
            value={pendingInvoices}
            icon={
              <Clock3 className="h-5 w-5" />
            }
            tone="amber"
          />

          <InvoiceStat
            label="Total due"
            value={currency(totalDue)}
            icon={
              <IndianRupee className="h-5 w-5" />
            }
            tone="teal"
          />

        </div>

        {/* Search */}
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event:any) =>
                  setSearch(event.target.value)
                }
                placeholder="Search invoice number or service..."
                className="h-11 rounded-2xl bg-background pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>
                  Invoice history
                </CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  Your service billing records.
                </p>
              </div>

              {filteredInvoices.length > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full"
                >
                  {filteredInvoices.length}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-2xl bg-muted"
                    />
                  ),
                )}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
                <p className="font-medium text-foreground">
                  Unable to load invoices
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Please refresh the page and try again.
                </p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <h3 className="mt-4 font-semibold text-foreground">
                  {search
                    ? "No matching invoices"
                    : "No invoices yet"}
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  {search
                    ? "Try another invoice number or service name."
                    : "Once a service is completed, your generated invoice will appear here."}
                </p>

                {!search && (
                  <Button
                    asChild
                    className="mt-5 rounded-xl"
                  >
                    <Link href="/customer/discovery">
                      Find a service
                    </Link>
                  </Button>
                )}

              </div>
            ) : (
              <div className="space-y-3">

                {filteredInvoices.map(
                  (invoice: any) => {
                    const styles =
                      getStatusStyles(
                        invoice.status,
                      );

                    const isDue =
                      Number(
                        invoice.balanceDue || 0,
                      ) > 0 &&
                      invoice.status !==
                        "cancelled";

                    return (
                      <Link
                        key={invoice._id}
                        href={`/customer/invoice/${invoice._id}`}
                        className="group block rounded-2xl border border-border/70 bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-accent/20 hover:shadow-md sm:p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                          {/* Left */}
                          <div className="flex min-w-0 items-start gap-3">

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                            >
                              <FileText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">
                                  {invoice.invoiceNumber}
                                </p>

                                <Badge
                                  className={`rounded-full ${styles.badge}`}
                                >
                                  {invoice.status}
                                </Badge>
                              </div>

                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                {invoice.bookingId
                                  ?.serviceType ||
                                  "Service invoice"}
                              </p>

                              {invoice.createdAt && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Issued{" "}
                                  {new Date(
                                    invoice.createdAt,
                                  ).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                              )}

                            </div>
                          </div>

                          {/* Right */}
                          <div className="flex items-center justify-between gap-5 sm:justify-end">

                            <div className="text-left sm:text-right">

                              <p className="text-lg font-semibold text-foreground">
                                {currency(
                                  invoice.grandTotal,
                                )}
                              </p>

                              {isDue ? (
                                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                  Due{" "}
                                  {currency(
                                    invoice.balanceDue,
                                  )}
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {invoice.status ===
                                  "paid"
                                    ? "Payment completed"
                                    : "No balance due"}
                                </p>
                              )}

                            </div>

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all group-hover:bg-brand-coral/10 group-hover:text-brand-coral">
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </div>

                          </div>

                        </div>
                      </Link>
                    );
                  },
                )}

              </div>
            )}

          </CardContent>
        </Card>

        {/* Payment information */}
        {invoices.length > 0 && (
          <Card className="rounded-2xl border-brand-teal/20 bg-brand-teal/5">
            <CardContent className="p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-semibold text-foreground">
                    Secure payments with Servizato
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Payments are processed securely through Razorpay.
                    Your invoice status updates after payment verification.
                  </p>
                </div>

              </div>

            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function InvoiceStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone:
    | "coral"
    | "teal"
    | "emerald"
    | "amber";
}) {
  const styles = {
    coral:
      "bg-brand-coral/10 text-brand-coral",
    teal:
      "bg-brand-teal/10 text-brand-teal",
    emerald:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
      <CardContent className="p-5">

        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-sm text-muted-foreground">
              {label}
            </p>

            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </div>

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}
          >
            {icon}
          </div>

        </div>

      </CardContent>
    </Card>
  );
}

export default CustomerInvoice;