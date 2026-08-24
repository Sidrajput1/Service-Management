"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  IndianRupee,
  MapPin,
  Package,
  Printer,
  Receipt,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useCustomerInvoiceById } from "@/hooks/useCustomer";

import CustomerPayBtn from "@/components/payments/CustomerPayBtn";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

function CustomerInvoiceDetailsById() {
  const params = useParams();

  const id = params?.id as string;

  const {
    data,
    isLoading,
    isError,
  } = useCustomerInvoiceById(id);

  const invoice = data?.invoice;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-130 animate-pulse rounded-3xl bg-muted" />
            <div className="h-105 animate-pulse rounded-3xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-3xl border-border/70 bg-card">
            <CardContent className="p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />

              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Invoice not found
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                We couldn't find this invoice or you may no longer
                have access to it.
              </p>

              <Button
                asChild
                className="mt-5 rounded-xl"
              >
                <Link href="/customer/invoices">
                  Back to invoices
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusStyles =
    getStatusStyles(invoice.status);

  const isPaid =
    Number(invoice.balanceDue || 0) <= 0 ||
    invoice.status === "paid";

  const customer =
    invoice.customerId;

  const booking =
    invoice.bookingId;

  const provider =
    invoice.serviceProviderId;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Back */}
        <Button
          asChild
          variant="ghost"
          className="-ml-2 rounded-xl"
        >
          <Link href="/customer/invoice">
            <ArrowLeft className="mr-2 h-4 w-4 inline" />
            Back to invoices
          </Link>
        </Button>

        {/* Invoice header */}
        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm">
          <CardContent className="relative p-6 sm:p-8">

            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-coral/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div className="min-w-0">

                <Badge className="mb-4 rounded-full border-brand-coral/20 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/10">
                  <Receipt className="mr-1.5 h-3.5 w-3.5" />
                  Invoice
                </Badge>

                <h1 className="font-poppins text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {invoice.invoiceNumber}
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                  Service invoice generated through Servizato.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge
                    className={`rounded-full ${statusStyles.badge}`}
                  >
                    {invoice.status}
                  </Badge>

                  {invoice.createdAt && (
                    <span className="text-xs text-muted-foreground">
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
                    </span>
                  )}
                </div>

              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 lg:min-w-47.5">

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Amount due
                </p>

                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {currency(
                    invoice.balanceDue,
                  )}
                </p>

                {invoice.dueDate && !isPaid && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due{" "}
                    {new Date(
                      invoice.dueDate,
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
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

          {/* Left */}
          <div className="space-y-6">

            {/* Customer + service */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-sm">

              <CardHeader>
                <CardTitle>
                  Service details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />

                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Customer
                      </span>
                    </div>

                    <p className="mt-2 font-semibold text-foreground">
                      {customer?.name ||
                        "Customer"}
                    </p>

                    {customer?.phone && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {customer.phone}
                      </p>
                    )}

                    {customer?.email && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {customer.email}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <WrenchIcon />

                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Service
                      </span>
                    </div>

                    <p className="mt-2 font-semibold text-foreground">
                      {booking?.serviceType ||
                        "Service"}
                    </p>

                    {booking?.scheduledAt && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(
                          booking.scheduledAt,
                        ).toLocaleString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    )}
                  </div>

                </div>

                {booking?.address && (
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />

                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Service address
                        </p>

                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {booking.address.addressLine ||
                            "Address not available"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          {booking.address.city ||
                            ""}
                          {booking.address.pincode
                            ? `, ${booking.address.pincode}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {provider?.companyName && (
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-coral/10 text-brand-coral">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Service provider
                      </p>

                      <p className="font-semibold text-foreground">
                        {provider.companyName}
                      </p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Items */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-sm">

              <CardHeader>
                <CardTitle>
                  Invoice items
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  Charges included in this invoice.
                </p>
              </CardHeader>

              <CardContent className="space-y-3">

                {invoice.items?.length ? (
                  invoice.items.map(
                    (
                      item: any,
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background p-4"
                      >
                        <div className="flex min-w-0 items-start gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <Package className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">

                            <p className="font-medium text-foreground">
                              {item.description}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.itemType ||
                                "Item"}{" "}
                              ×{" "}
                              {item.qty}
                            </p>

                          </div>
                        </div>

                        <p className="shrink-0 font-semibold text-foreground">
                          {currency(
                            item.amount,
                          )}
                        </p>
                      </div>
                    ),
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No invoice items found.
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>

          </div>

          {/* Right */}
          <div className="space-y-6">

            {/* Payment summary */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-sm">

              <CardHeader>
                <CardTitle>
                  Payment summary
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

                <SummaryRow
                  label="Subtotal"
                  value={currency(
                    invoice.subtotal,
                  )}
                />

                {Number(
                  invoice.taxAmount || 0,
                ) > 0 && (
                  <SummaryRow
                    label={`Tax (${invoice.taxPercent || 0}%)`}
                    value={currency(
                      invoice.taxAmount,
                    )}
                  />
                )}

                <Separator />

                <SummaryRow
                  label="Invoice total"
                  value={currency(
                    invoice.grandTotal,
                  )}
                  strong
                />

                <SummaryRow
                  label="Paid"
                  value={currency(
                    invoice.amountPaid,
                  )}
                />

                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-4">

                    <span className="text-sm font-medium text-foreground">
                      Balance due
                    </span>

                    <span className="text-xl font-semibold text-foreground">
                      {currency(
                        invoice.balanceDue,
                      )}
                    </span>

                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Payment action */}
            <Card
              className={`rounded-3xl shadow-sm ${
                isPaid
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-brand-coral/20 bg-brand-coral/5"
              }`}
            >
              <CardContent className="p-6">

                {isPaid ? (
                  <div>

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>

                      <div>
                        <p className="font-semibold text-foreground">
                          Payment completed
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          This invoice has been fully paid.
                        </p>
                      </div>

                    </div>

                    {invoice.paymentReceivedAt && (
                      <p className="mt-4 text-xs text-muted-foreground">
                        Payment received{" "}
                        {new Date(
                          invoice.paymentReceivedAt,
                        ).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    )}

                  </div>
                ) : (
                  <div>

                    <Badge className="rounded-full border-brand-coral/20 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/10">
                      <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                      Payment required
                    </Badge>

                    <h3 className="mt-3 text-xl font-semibold text-foreground">
                      Pay{" "}
                      {currency(
                        invoice.balanceDue,
                      )}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Complete your payment securely through Razorpay.
                    </p>

                    <div className="mt-5">
                      <CustomerPayBtn
                        invoiceId={
                          invoice._id
                        }
                        customerName={
                          customer?.name
                        }
                        customerPhone={
                          customer?.phone
                        }
                        customerEmail={
                          customer?.email
                        }
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-teal" />
                      Secure payment verification
                    </div>

                  </div>
                )}

              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-sm">

              <CardHeader>
                <CardTitle>
                  Invoice actions
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start rounded-xl"
                  onClick={() =>
                    window.open(
                      `/api/invoices/${invoice._id}/pdf`,
                      "_blank",
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start rounded-xl"
                  onClick={() =>
                    window.print()
                  }
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print invoice
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start rounded-xl"
                >
                  <Link href="/customer/invoices">
                    <ArrowLeft className="mr-2 h-4 w-4 inline" />
                    Back to invoices
                  </Link>
                </Button>

              </CardContent>
            </Card>

          </div>
        </div>

        {/* Trust footer */}
        <Card className="rounded-2xl border-brand-teal/20 bg-brand-teal/5">
          <CardContent className="p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-foreground">
                  Secure billing with Servizato
                </p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Payment status is updated only after the payment
                  is successfully verified.
                </p>
              </div>

            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "font-semibold text-foreground"
            : "text-sm text-muted-foreground"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "font-semibold text-foreground"
            : "text-sm font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

function WrenchIcon() {
  return (
    <IndianRupee className="h-4 w-4 text-muted-foreground" />
  );
}

export default CustomerInvoiceDetailsById;