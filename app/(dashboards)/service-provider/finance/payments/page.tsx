"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Search,
} from "lucide-react";

import {
  useProviderPayments,
} from "@/hooks/useProviderPayments";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Input,
} from "@/components/ui/input";

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

export default function ProviderPaymentsPage() {
  const [status, setStatus] =
    useState("success");

  const [search, setSearch] =
    useState("");

  const {
    data,
    isLoading,
    isError,
  } = useProviderPayments(status);

  const payments =
    data?.payments || [];

  const filteredPayments =
    payments.filter(
      (payment: any) => {
        const value =
          search
            .trim()
            .toLowerCase();

        if (!value) {
          return true;
        }

        return (
          payment.gatewayTxnId
            ?.toLowerCase()
            .includes(value) ||
          payment.invoiceId?.invoiceNumber
            ?.toLowerCase()
            .includes(value) ||
          payment.customerId?.name
            ?.toLowerCase()
            .includes(value)
        );
      },
    );

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">
          Finance
        </Badge>

        <h1 className="text-3xl font-semibold tracking-tight">
          Payments
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Track successful customer payments associated
          with your completed jobs.
        </p>
      </section>

      {/* Filters */}
      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
                placeholder="Search invoice, customer, transaction..."
                className="h-11 rounded-xl pl-10"
              />
            </div>

            <div className="flex gap-2">
              {[
                ["success", "Successful"],
                ["all", "All"],
              ].map(
                ([value, label]) => (
                  <Button
                    key={value}
                    variant={
                      status === value
                        ? "default"
                        : "outline"
                    }
                    className="rounded-xl"
                    onClick={() =>
                      setStatus(value)
                    }
                  >
                    {label}
                  </Button>
                ),
              )}
            </div>

          </div>

        </CardContent>
      </Card>

      {/* List */}
      <Card className="rounded-2xl border-border/70">

        <CardContent className="p-0">

          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">
              Loading payments...
            </div>
          ) : isError ? (
            <div className="p-8 text-sm text-destructive">
              Unable to load payments.
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />

              <h3 className="mt-3 font-medium">
                No payments found
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Successful customer payments will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">

              {filteredPayments.map(
                (payment: any) => (
                  <div
                    key={payment._id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                  >

                    {/* Payment info */}
                    <div className="flex min-w-0 gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <IndianRupee className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {payment.invoiceId
                              ?.invoiceNumber ||
                              "Payment"}
                          </p>

                          <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            {payment.status}
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {payment.customerId
                            ?.name ||
                            "Customer"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {payment.paidAt
                            ? new Date(
                                payment.paidAt,
                              ).toLocaleString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "—"}
                        </p>

                      </div>

                    </div>

                    {/* Amount */}
                    <div className="flex items-center justify-between gap-5 sm:justify-end">

                      <div className="text-right">

                        <p className="text-lg font-semibold">
                          {currency(
                            payment.amount,
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {payment.mode ||
                            "Payment"}
                          {" · "}
                          {payment.gateway ||
                            "gateway"}
                        </p>

                        {payment.gatewayTxnId && (
                          <p className="mt-1 max-w-45 truncate text-[10px] text-muted-foreground">
                            {payment.gatewayTxnId}
                          </p>
                        )}

                      </div>

                      {payment.invoiceId?._id && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                        >
                          <Link
                            href={`/service-provider/finance/invoices/${payment.invoiceId._id}`}
                          >
                            Invoice
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}

                    </div>

                  </div>
                ),
              )}

            </div>
          )}

        </CardContent>

      </Card>

      {/* Footer note */}
      <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />

        <p className="text-xs leading-5 text-muted-foreground">
          Revenue shown here is based on successfully
          recorded payment transactions, not simply completed
          jobs or issued invoices.
        </p>
      </div>

    </div>
  );
}