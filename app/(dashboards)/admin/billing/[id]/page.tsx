"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InvoiceBreakdown } from "@/components/invoice/InvoiceBreakdown";
import type { invoiceBreakdown } from "@/lib/invoice-breakdown";
import type { InvoiceDetail } from "@/lib/customer-types";

export default function PrintableInvoicePage() {
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<{
    invoice: Omit<InvoiceDetail, "bookingId" | "jobId"> & {
      customerId?: { name?: string; phone?: string; email?: string; addresses?: { addressLine?: string }[] };
      bookingId?: { serviceType?: string };
      jobId?: { scheduledAt?: string };
    };
    breakdown: ReturnType<typeof invoiceBreakdown>;
  } | null>(null);
  const invoice = record?.invoice;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await axios.get(`/api/invoices/${id}`);
        setRecord(data);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!invoice || !record) {
    return <div className="p-6">Invoice not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex gap-2 print:hidden">
          <Button onClick={() => window.print()}>Print</Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/api/invoices/${id}/pdf`, "_blank")}
          >
            Download PDF
          </Button>
        </div>

        <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">INVOICE</h1>
                <p className="text-sm text-slate-500">Invoice No: {invoice.invoiceNumber}</p>
                <p className="text-sm text-slate-500">Status: {invoice.status}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">Your Company Name</div>
                <div className="text-sm text-slate-500">Service Management System</div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBox
                title="Bill To"
                lines={[
                  invoice.customerId?.name,
                  invoice.customerId?.phone,
                  invoice.customerId?.email,
                  invoice.customerId?.addresses?.[0]?.addressLine,
                ]}
              />
              <InfoBox
                title="Service Info"
                lines={[
                  `Service: ${invoice.bookingId?.serviceType || "-"}`,
                  `Scheduled: ${invoice.jobId?.scheduledAt ? new Date(invoice.jobId.scheduledAt).toLocaleString() : "-"}`,
                  `Issued At: ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString() : "-"}`,
                  `Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleString() : "-"}`,
                ]}
              />
            </div>

            <div className="mt-6">
              <InvoiceBreakdown breakdown={record.breakdown} currency={invoice.currency} payment={invoice} />
            </div>

            {invoice.notes ? (
              <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                <div className="font-medium">Notes</div>
                <p className="mt-2 text-sm text-slate-600">{invoice.notes}</p>
              </div>
            ) : null}

            <div className="mt-8 text-sm text-slate-500">
              Thank you for your business.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoBox({ title, lines }: { title: string; lines: Array<string | undefined> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-medium">{title}</div>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        {lines.filter(Boolean).map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    </div>
  );
}
