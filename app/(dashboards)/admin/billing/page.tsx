"use client";

import React, { useState, type FormEvent } from "react";
import { jobActionError } from "@/components/finance/JobQuotePanel";
import { InvoiceBreakdown } from "@/components/invoice/InvoiceBreakdown";
import { invoiceBreakdown } from "@/lib/invoice-breakdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useCreateInvoiceFromJob,
  useCreatePayment,
  useFinalizeInvoice,
  useInvoices,
} from "@/hooks/useBillings";
import { useJobs } from "@/hooks/useJobs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CreditCard,
  FileText,
  IndianRupee,
  Loader2,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function badgeForStatus(status?: string) {
  const s = (status || "draft").toLowerCase();

  if (s.includes("paid") || s.includes("closed") || s.includes("final")) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Paid
      </Badge>
    );
  }
  if (s.includes("partial")) {
    return (
      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
        Partial
      </Badge>
    );
  }
  if (s.includes("overdue")) {
    return (
      <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
        Overdue
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
      Draft
    </Badge>
  );
}

function formatMoney(value?: number | string | null) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function StatCard({
  title,
  value,
  icon: Icon,
  note,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  note: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="truncate text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="text-xs text-slate-500">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminBillingPage() {
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: invoicesData, isLoading, refetch } = useInvoices(page, 20);

  const { data: jobsData } = useJobs(1, 100);

  const createInvoice = useCreateInvoiceFromJob();
  const [invoiceJobId, setInvoiceJobId] = useState("");
  const finalizeInvoice = useFinalizeInvoice();
  const createPayment = useCreatePayment();

  const router = useRouter();
  const billingPath = usePathname();
  const invoices = invoicesData?.invoices || [];

  const selectedInvoice = invoices.find(
    (inv: any) => inv._id === selectedInvoiceId,
  );

  const q = search.trim().toLowerCase();
  const filteredInvoices = invoices.filter((inv: any) => {
    const customer = inv.customerId?.name || "";
    const number = inv.invoiceNumber || "";
    const status = (inv.status || "").toLowerCase();
    const matchesQuery = !q || `${customer} ${number}`.toLowerCase().includes(q);
    const matchesStatus = selectedStatus === "all" || status.includes(selectedStatus);
    return matchesQuery && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((inv: any) =>
      (inv.status || "").toLowerCase().includes("paid"),
    ).length,
    pending: invoices.filter((inv: any) =>
      /draft|pending/.test((inv.status || "").toLowerCase()),
    ).length,
    totalRevenue: invoices.reduce((sum: number, inv: any) =>
      sum + Number(inv.grandTotal || 0), 0),
  };

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoiceJobId) return;
    try {
      const { invoice } = await createInvoice.mutateAsync({ jobId: invoiceJobId });
      toast.success("Invoice is ready");
      setInvoiceJobId("");
      setPage(1);
      setSelectedInvoiceId(invoice._id);
    } catch (error) {
      toast.error(jobActionError(error, "Failed to create invoice"));
    }
  }

  async function handleFinalize(invoiceId: string) {
    try {
      await finalizeInvoice.mutateAsync(invoiceId);
      toast.success("Invoice finalized");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to finalize invoice");
    }
  }

  const submitPayment = async (payload: {
    amount: number;
    mode: string;
    note?: string;
  }) => {
    if (!selectedInvoice) return;

    try {
      await createPayment.mutateAsync({
        invoiceId: selectedInvoice._id,
        amount: payload.amount,
        mode: payload.mode,
        note: payload.note || "",
        status: "success",
      });

      toast.success("Payment recorded successfully");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to record payment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={String(stats.total)}
          icon={ReceiptText}
          note="All generated invoices"
        />
        <StatCard
          title="Paid Invoices"
          value={String(stats.paid)}
          icon={ShieldCheck}
          note="Successfully collected"
        />
        <StatCard
          title="Pending Invoices"
          value={String(stats.pending)}
          icon={CalendarDays}
          note="Need follow-up"
        />
        <StatCard
          title="Gross Revenue"
          value={formatMoney(stats.totalRevenue)}
          icon={IndianRupee}
          note="Before deductions"
        />
      </div>

      {/* Create invoice */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
              Create Invoice from Job
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Generate or recover the invoice for a completed job using its authorized pricing.
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={onCreate} className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="invoice-job" className="text-sm font-medium">Completed job</Label>
              <select
                id="invoice-job"
                required
                value={invoiceJobId}
                onChange={(event) => setInvoiceJobId(event.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="">Select completed job</option>
                {(jobsData?.jobs || []).filter((job: {
                  status: string;
                }) => job.status === "completed").map((job: {
                  _id: string;
                  bookingId?: { serviceType?: string; customerId?: { name?: string } };
                }) => (
                  <option key={job._id} value={job._id}>
                    {job.bookingId?.serviceType || "Service"} · {job.bookingId?.customerId?.name || "Customer"} · {job._id.slice(-6)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={!invoiceJobId || createInvoice.isPending}>
              {createInvoice.isPending ? "Preparing invoice…" : "Open or generate invoice"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invoice list */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Invoices
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Track payment status, open invoice details, and collect payments
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoice or customer..."
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value || "all")}
              >
                <SelectTrigger className="h-11 w-full rounded-xl sm:w-44">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">
                    Invoice #
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Customer
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Total
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Paid
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Balance
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-slate-500"
                    >
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      <div className="mx-auto max-w-sm">
                        <p className="text-base font-medium text-slate-900">
                          No invoices found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing the search or status filter.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice: any) => (
                    <TableRow
                      key={invoice._id}
                      className="hover:bg-slate-50/70"
                    >
                      <TableCell className="font-medium text-slate-900">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {invoice.customerId?.name || "-"}
                      </TableCell>
                      <TableCell className="text-slate-900">
                        {formatMoney(invoice.grandTotal)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatMoney(invoice.amountPaid)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatMoney(invoice.balanceDue)}
                      </TableCell>
                      <TableCell>{badgeForStatus(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedInvoiceId(invoice._id)}
                          className="rounded-xl"
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

          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-900">{page}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice detail dialog */}
      <Dialog
        open={!!selectedInvoiceId}
        onOpenChange={(open) => !open && setSelectedInvoiceId("")}
      >
        <DialogContent className=" w-full max-w-7xl  rounded-3xl border-slate-200 p-0">
          <div className="border-b border-slate-100 bg-linear-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Invoice Details
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Review totals, items, payments, and finalize when ready
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedInvoice && (
            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Info label="Invoice" value={selectedInvoice.invoiceNumber} />
                <Info
                  label="Customer"
                  value={selectedInvoice.customerId?.name || "-"}
                />
                <Info
                  label="Total"
                  value={formatMoney(selectedInvoice.grandTotal)}
                />
                <Info
                  label="Balance"
                  value={formatMoney(selectedInvoice.balanceDue)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <MiniStat
                  label="Paid"
                  value={formatMoney(selectedInvoice.amountPaid)}
                  icon={Wallet}
                />
                <MiniStat
                  label="Status"
                  value={selectedInvoice.status || "-"}
                  icon={FileText}
                />
                <MiniStat
                  label="Job"
                  value={selectedInvoice.jobId?.status || "-"}
                  icon={Sparkles}
                />
              </div>

              <InvoiceBreakdown breakdown={invoiceBreakdown(selectedInvoice, selectedInvoice.bookingId?.pricing)} currency={selectedInvoice.currency} />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => handleFinalize(selectedInvoice._id)}
                  className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  Finalize Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl"
                >
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `/api/invoices/${selectedInvoice._id}/pdf`,
                      "_blank",
                    )
                  }
                  className="rounded-xl"
                >
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`${billingPath.startsWith("/dispatcher") ? "/dispatcher" : "/admin"}/billing/${selectedInvoice._id}`)
                  }
                  className="rounded-xl"
                >
                  Open Printable View
                </Button>
              </div>

              <Separator />

              <PaymentBox
                invoiceId={selectedInvoice._id}
                onSubmit={submitPayment}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="font-medium text-slate-900">{value}</p>
        </div>
      </div>
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

function PaymentBox({
  invoiceId,
  onSubmit,
}: {
  invoiceId: string;
  onSubmit: (payload: {
    amount: number;
    mode: string;
    note?: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("upi");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitPayment() {
    if (!amount) {
      toast.error("Enter payment amount");
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        amount: Number(amount),
        mode,
        note,
      });
      setAmount("");
      setNote("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Record Payment
          </h3>
          <p className="text-sm text-slate-500">
            Capture offline or manual payment
          </p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          Invoice: {invoiceId.slice(-6)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Amount</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            className="h-11 rounded-xl"
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Mode</Label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="wallet">Wallet</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Note</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 rounded-xl"
            placeholder="Optional note"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={submitPayment}
          disabled={loading}
          className="rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Payment"
          )}
        </Button>
      </div>
    </div>
  );
}
