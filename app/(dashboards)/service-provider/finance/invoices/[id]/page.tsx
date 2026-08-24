"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  IndianRupee,
  MapPin,
  UserRound,
  Wrench,
} from "lucide-react";

import {
  useQuery,
} from "@tanstack/react-query";

import api from "@/lib/api";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Separator,
} from "@/components/ui/separator";

function currency(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(value || 0);
}

export default function ProviderInvoiceDetailPage() {
  const params = useParams();

  const id =
    String(params.id);

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      "provider-invoice",
      id,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/finance/invoices/${id}`,
        );

      return data;
    },

    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-150 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  const invoice =
    data?.invoice;

  if (!invoice) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <p className="font-medium">
            Invoice not found
          </p>
        </CardContent>
      </Card>
    );
  }

  const booking =
    invoice.bookingId;

  const job =
    invoice.jobId;

  const customer =
    invoice.customerId;

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <Button
        asChild
        variant="ghost"
        className="-ml-3 rounded-xl"
      >
        <Link href="/service-provider/finance/invoices">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Invoices
        </Link>
      </Button>

      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

          <div>
            <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">
              Invoice
            </Badge>

            <h1 className="text-3xl font-semibold">
              {invoice.invoiceNumber}
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              {booking?.serviceType ||
                "Service"}
            </p>
          </div>

          <Badge className="w-fit rounded-full bg-white/10 text-white hover:bg-white/10">
            {invoice.status}
          </Badge>

        </div>

      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

        <div className="space-y-6">

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>
                Invoice items
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              {invoice.items?.map(
                (
                  item: any,
                  index: number,
                ) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 rounded-2xl border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {item.description}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.itemType} · Qty{" "}
                        {item.qty}
                      </p>
                    </div>

                    <p className="font-semibold">
                      {currency(
                        item.amount,
                      )}
                    </p>
                  </div>
                ),
              )}

              <Separator />

              <SummaryRow
                label="Subtotal"
                value={currency(
                  invoice.subtotal,
                )}
              />

              {Number(
                invoice.discountAmount || 0,
              ) > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`-${currency(
                    invoice.discountAmount,
                  )}`}
                />
              )}

              <SummaryRow
                label={`Tax (${invoice.taxPercent || 0}%)`}
                value={currency(
                  invoice.taxAmount,
                )}
              />

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Total
                </span>

                <span className="text-2xl font-semibold">
                  {currency(
                    invoice.grandTotal,
                  )}
                </span>
              </div>

            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>
                Customer
              </CardTitle>
            </CardHeader>

            <CardContent>

              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white">
                  {(customer?.name ||
                    "C")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="font-semibold">
                    {customer?.name}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {customer?.phone}
                  </p>
                </div>

              </div>

              <Separator className="my-5" />

              <div className="flex gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">
                    Service address
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking?.address?.addressLine}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {booking?.address?.city}
                    {booking?.address?.pincode
                      ? `, ${booking.address.pincode}`
                      : ""}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>
                Payment
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="rounded-2xl bg-muted/40 p-5">

                <p className="text-sm text-muted-foreground">
                  Total
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {currency(
                    invoice.grandTotal,
                  )}
                </p>

              </div>

              <SummaryRow
                label="Paid"
                value={currency(
                  invoice.amountPaid,
                )}
              />

              <SummaryRow
                label="Balance due"
                value={currency(
                  invoice.balanceDue,
                )}
              />

              <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                {invoice.status}
              </Badge>

              {invoice.status ===
                "paid" && (
                <div className="rounded-2xl bg-emerald-50 p-4">

                  <div className="flex items-center gap-2 font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Payment received
                  </div>

                  <p className="mt-1 text-xs text-emerald-700/80">
                    {invoice.paymentReceivedAt
                      ? new Date(
                          invoice.paymentReceivedAt,
                        ).toLocaleString(
                          "en-IN",
                        )
                      : ""}
                  </p>

                </div>
              )}

            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>
                Job reference
              </CardTitle>
            </CardHeader>

            <CardContent>

              <div className="space-y-4">

                <div className="flex items-center gap-3">
                  <Wrench className="h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Job status
                    </p>

                    <p className="font-medium">
                      {job?.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserRound className="h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Payment status
                    </p>

                    <p className="font-medium">
                      {job?.paymentStatus}
                    </p>
                  </div>
                </div>

              </div>

            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span className="font-medium">
        {value}
      </span>
    </div>
  );
}