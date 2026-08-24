"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  ArrowRight,
  FileText,
  Search,
} from "lucide-react";

import api from "@/lib/api";

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

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

    case "partial":
      return "bg-amber-50 text-amber-700 hover:bg-amber-50";

    case "issued":
      return "bg-blue-50 text-blue-700 hover:bg-blue-50";

    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ProviderInvoicesPage() {
  const [status, setStatus] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "provider-invoices",
      status,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/finance/invoices?status=${status}`,
        );

      return data;
    },
  });

  const invoices =
    data?.invoices || [];

  const filtered =
    invoices.filter(
      (invoice: any) => {
        const value =
          search.trim().toLowerCase();

        if (!value) {
          return true;
        }

        return (
          invoice.invoiceNumber
            ?.toLowerCase()
            .includes(value) ||
          invoice.customerId?.name
            ?.toLowerCase()
            .includes(value) ||
          invoice.bookingId?.serviceType
            ?.toLowerCase()
            .includes(value)
        );
      },
    );

  return (
    <div className="space-y-6">

      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">
          Finance
        </Badge>

        <h1 className="text-3xl font-semibold tracking-tight">
          Invoices
        </h1>

        <p className="mt-2 text-sm text-slate-300">
          View all invoices generated from your completed jobs.
        </p>
      </section>

      <Card className="rounded-2xl">
        <CardContent className="p-4">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Search invoice, customer, service..."
                className="h-11 rounded-xl pl-10"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="flex gap-2">
              {[
                ["all", "All"],
                ["issued", "Pending"],
                ["partial", "Partial"],
                ["paid", "Paid"],
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

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-0">

          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">
              Loading invoices...
            </div>
          ) : isError ? (
            <div className="p-8 text-sm text-destructive">
              Unable to load invoices.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">

              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />

              <h3 className="mt-3 font-medium">
                No invoices found
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Generated invoices will appear here.
              </p>

            </div>
          ) : (
            <div className="divide-y">

              {filtered.map(
                (invoice: any) => (
                  <div
                    key={invoice._id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="flex min-w-0 gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">

                        <p className="font-semibold">
                          {invoice.invoiceNumber}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {invoice.bookingId?.serviceType ||
                            "Service"}{" "}
                          ·{" "}
                          {invoice.customerId?.name ||
                            "Customer"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {invoice.createdAt
                            ? new Date(
                                invoice.createdAt,
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </p>

                      </div>

                    </div>

                    <div className="flex items-center justify-between gap-5 sm:justify-end">

                      <div className="text-right">
                        <p className="font-semibold">
                          {currency(
                            invoice.grandTotal,
                          )}
                        </p>

                        {Number(
                          invoice.balanceDue || 0,
                        ) > 0 && (
                          <p className="text-xs text-amber-600">
                            Due{" "}
                            {currency(
                              invoice.balanceDue,
                            )}
                          </p>
                        )}
                      </div>

                      <Badge
                        className={`rounded-full ${statusClass(
                          invoice.status,
                        )}`}
                      >
                        {invoice.status}
                      </Badge>

                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                      >
                        <Link
                          href={`/service-provider/finance/invoices/${invoice._id}`}
                        >
                          View
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>

                    </div>

                  </div>
                ),
              )}

            </div>
          )}

        </CardContent>
      </Card>

    </div>
  );
}