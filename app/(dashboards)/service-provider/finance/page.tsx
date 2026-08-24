"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  IndianRupee,
  Receipt,
  TrendingUp,
} from "lucide-react";

import { useProviderFinance } from "@/hooks/useProviderFinance";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

    case "partial":
      return "bg-amber-50 text-amber-700 hover:bg-amber-50";

    case "issued":
      return "bg-blue-50 text-blue-700 hover:bg-blue-50";

    case "cancelled":
      return "bg-rose-50 text-rose-700 hover:bg-rose-50";

    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ProviderFinancePage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError } = useProviderFinance(period);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <h2 className="font-semibold">Unable to load finance data</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overview = data?.overview || {};

  const revenueTrend = data?.revenueTrend || [];

  const payments = data?.recentPayments || [];

  const invoices = data?.recentInvoices || [];

  const maxRevenue = Math.max(
    ...revenueTrend.map((item: any) => Number(item.revenue || 0)),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">
              Finance
            </Badge>

            <h1 className="text-3xl font-semibold tracking-tight">
              Finance & Revenue
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Track revenue, customer payments, outstanding invoices, and
              financial performance.
            </p>
          </div>

          {/* <Button
            asChild
            variant="outline"
            className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/service-provider/finance/invoices">
              <FileText className="mr-2 h-4 w-4" />
              View All Invoices
            </Link>
          </Button> */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default">
              <Link href="/service-provider/finance">Overview</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/service-provider/finance/invoices">Invoices</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/service-provider/finance/payments">Payments</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Period */}
      <div className="flex flex-wrap justify-end gap-2">
        {[
          ["7d", "7 days"],
          ["30d", "30 days"],
          ["90d", "90 days"],
          ["12m", "12 months"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={period === value ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceStat
          label="Total revenue"
          value={currency(overview.totalRevenue)}
          icon={IndianRupee}
        />

        <FinanceStat
          label="Period revenue"
          value={currency(overview.periodRevenue)}
          icon={TrendingUp}
        />

        <FinanceStat
          label="Pending amount"
          value={currency(overview.pendingAmount)}
          icon={Clock3}
        />

        <FinanceStat
          label="Paid invoices"
          value={String(overview.paidInvoices || 0)}
          icon={CheckCircle2}
        />
      </div>

      {/* Revenue trend */}
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Revenue trend</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Revenue from successful customer payments.
            </p>
          </div>

          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </CardHeader>

        <CardContent>
          {revenueTrend.length === 0 ? (
            <EmptyBlock text="No successful payments in this period." />
          ) : (
            <div className="overflow-x-auto">
              <div
                className="flex min-w-162.5 items-end gap-2"
                style={{
                  height: 280,
                }}
              >
                {revenueTrend.map((item: any) => {
                  const height = Math.max(
                    10,
                    (Number(item.revenue || 0) / maxRevenue) * 220,
                  );

                  return (
                    <div
                      key={item.date}
                      className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {currency(item.revenue)}
                      </span>

                      <div
                        className="w-full max-w-8 rounded-t-lg bg-slate-900 transition-all"
                        style={{
                          height,
                        }}
                      />

                      <span className="max-w-14 truncate text-[10px] text-muted-foreground">
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lower sections */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Payments */}
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent payments</CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Successful customer payments.
              </p>
            </div>

            <Receipt className="h-5 w-5 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            {payments.length === 0 ? (
              <EmptyBlock text="No payments yet." />
            ) : (
              <div className="space-y-3">
                {payments.map((payment: any) => (
                  <div
                    key={payment._id}
                    className="flex items-center justify-between gap-4 rounded-2xl border p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {payment.invoiceId?.invoiceNumber || "Payment"}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {payment.customerId?.name || "Customer"}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {payment.paidAt
                          ? new Date(payment.paidAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">
                        +{currency(payment.amount)}
                      </p>

                      <Badge className="mt-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        Paid
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent invoices</CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Generated invoices for your completed jobs.
              </p>
            </div>

            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            {invoices.length === 0 ? (
              <EmptyBlock text="No invoices yet." />
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice: any) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between gap-4 rounded-2xl border p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{invoice.invoiceNumber}</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {invoice.customerId?.name || "Customer"}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {invoice.bookingId?.serviceType || "Service"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {currency(invoice.grandTotal)}
                      </p>

                      <Badge
                        className={`mt-1 rounded-full ${statusClass(
                          invoice.status,
                        )}`}
                      >
                        {invoice.status}
                      </Badge>

                      <div className="mt-2">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary footer */}
      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <MiniMetric
              label="Total invoices"
              value={overview.totalInvoices || 0}
            />

            <MiniMetric
              label="Pending invoices"
              value={overview.pendingInvoices || 0}
            />

            <MiniMetric
              label="Successful payments"
              value={overview.totalPaidTransactions || 0}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>

            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
