"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Separator,
} from "@/components/ui/separator";

import api from "@/lib/api";
import {
  useQuery,
} from "@tanstack/react-query";
import React from "react";

function currency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(value || 0);
}

export default function CustomerInvoicePage() {
  const params = useParams();
  const router = useRouter();

  const invoiceId =
    String(params.id);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "customer-invoice",
      invoiceId,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/customer/invoices/${invoiceId}`,
        );

      return data;
    },

    enabled:
      Boolean(invoiceId),
  });

  console.log("invoice data",data);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />

        <div className="h-125 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (
    isError ||
    !data?.invoice
  ) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">
            Invoice not found
          </h2>

          <Button
            asChild
            className="mt-5 rounded-xl"
          >
            <Link href="/customer/bookings">
              Back to My Bookings
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const invoice =
    data.invoice;

  const items =
    invoice.items || [];

  const isPaid =
    invoice.status ===
    "paid";

  const canPay =
    data.canPay;

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <Button
        variant="ghost"
        onClick={() =>
          router.back()
        }
        className="-ml-3 rounded-xl"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header */}
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">
              Invoice
            </Badge>

            <h1 className="text-3xl font-semibold tracking-tight">
              {invoice.invoiceNumber}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Issued{" "}
              {invoice.issuedAt
                ? new Date(
                    invoice.issuedAt,
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      dateStyle:
                        "medium",
                    },
                  )
                : "—"}
            </p>
          </div>

          <Badge
            className={`rounded-full ${
              isPaid
                ? "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/10"
                : "bg-amber-400/10 text-amber-300 hover:bg-amber-400/10"
            }`}
          >
            {isPaid
              ? "Paid"
              : "Payment pending"}
          </Badge>

        </div>
      </section>

      {/* Items */}
      <Card className="rounded-2xl border-border/70">

        <CardHeader>
          <CardTitle>
            Invoice details
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {items.map(
            (
              item: any,
              index: number,
            ) => (
              <div
                key={`${item.description}-${index}`}
                className="flex items-center justify-between gap-4"
              >

                <div>
                  <p className="font-medium">
                    {item.description}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.itemType ===
                    "part"
                      ? "Part"
                      : "Service"}{" "}
                    · Qty {item.qty}
                  </p>
                </div>

                <p className="font-medium">
                  {currency(
                    item.amount,
                  )}
                </p>

              </div>
            ),
          )}

          <Separator />

          <div className="space-y-3">

            <SummaryRow
              label="Subtotal"
              value={currency(
                invoice.subtotal,
              )}
            />

            {Number(
              invoice.discountAmount ||
                0,
            ) > 0 && (
              <SummaryRow
                label="Discount"
                value={`-${currency(
                  invoice.discountAmount,
                )}`}
                valueClassName="text-emerald-600"
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
              <span className="text-base font-semibold">
                Total
              </span>

              <span className="text-2xl font-semibold">
                {currency(
                  invoice.grandTotal,
                )}
              </span>
            </div>

          </div>

        </CardContent>
      </Card>

      {/* Payment */}
      <Card className="rounded-2xl border-border/70">

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Payment
          </CardTitle>
        </CardHeader>

        <CardContent>

          {isPaid ? (
            <div className="rounded-2xl bg-emerald-50 p-5">

              <div className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                Payment received
              </div>

              <p className="mt-2 text-sm text-emerald-700/80">
                Payment of{" "}
                {currency(
                  invoice.amountPaid,
                )}{" "}
                has been successfully received.
              </p>

            </div>
          ) : (
            <div className="space-y-5">

              <div className="grid gap-4 sm:grid-cols-3">

                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Total
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {currency(
                      invoice.grandTotal,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Paid
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {currency(
                      invoice.amountPaid,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-700">
                    Balance
                  </p>

                  <p className="mt-1 text-lg font-semibold text-amber-800">
                    {currency(
                      invoice.balanceDue,
                    )}
                  </p>
                </div>

              </div>

              {canPay && (
                <PayInvoiceButton
                  invoiceId={
                    invoice._id
                  }

                  amount={
                    invoice.balanceDue
                  }
                />
              )}

            </div>
          )}

        </CardContent>
      </Card>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">

        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

        <p className="text-xs leading-5 text-muted-foreground">
          Payments are processed securely through Razorpay.
          Your payment status is confirmed by our server after
          receiving the payment gateway notification.
        </p>

      </div>

    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span
        className={
          valueClassName ||
          "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

function PayInvoiceButton({
  invoiceId,
  amount,
}: {
  invoiceId: string;
  amount: number;
}) {
  const [loading, setLoading] =
    React.useState(false);

  async function handlePay() {
    try {
      setLoading(true);

      const { data } =
        await api.post(
          `/customer/invoices/${invoiceId}/pay`,
        );

      if (!data?.order?.id) {
        throw new Error(
          "Unable to create payment order",
        );
      }

      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout failed to load",
        );
      }

      const options = {
        key: data.keyId,

        amount:
          data.order.amount,

        currency:
          data.order.currency,

        name:
          data.providerName ||
          "ServiceFlow",

        description:
          `Payment for ${data.invoice.invoiceNumber}`,

        order_id:
          data.order.id,

        prefill: {
          name:
            data.customer?.name ||
            "",

          email:
            data.customer?.email ||
            "",

          contact:
            data.customer?.phone ||
            "",
        },

        theme: {
          color: "#0f172a",
        },

        handler: () => {
          /*
           * IMPORTANT:
           *
           * Do NOT mark invoice paid here.
           *
           * Webhook is the financial source
           * of truth.
           */
          
          window.location.reload();
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay =
        new window.Razorpay(
          options,
        );

      razorpay.open();
    } catch (error: any) {
      console.error(
        "Payment error:",
        error,
      );

      alert(
        error?.response?.data?.error ||
          error.message ||
          "Unable to start payment",
      );

      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handlePay}
      disabled={loading}
      className="h-12 w-full rounded-xl text-base"
    >
      <IndianRupee className="mr-2 h-4 w-4" />

      {loading
        ? "Preparing payment..."
        : `Pay ${currency(amount)}`}
    </Button>
  );
}

function loadRazorpayScript() {
  return new Promise<boolean>(
    (resolve) => {
      if (
        typeof window ===
          "undefined"
      ) {
        resolve(false);
        return;
      }

      if (
        window.Razorpay
      ) {
        resolve(true);
        return;
      }

      const script =
        document.createElement(
          "script",
        );

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () =>
        resolve(true);

      script.onerror = () =>
        resolve(false);

      document.body.appendChild(
        script,
      );
    },
  );
}