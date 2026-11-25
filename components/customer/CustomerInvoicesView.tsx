"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText, ArrowUpRight } from "lucide-react";
import { useCustomerInvoice, useCustomerInvoiceById } from "@/hooks/useCustomer";
import { CustomerPageHeading, CustomerState, CursorPager, StatusBadge } from "./CustomerUi";
import { dateTime, money, type InvoiceSummary, type InvoiceDetail, type CustomerIdentity } from "@/lib/customer-types";
import CustomerPayBtn from "@/components/payments/CustomerPayBtn";
import { InvoiceBreakdown } from "@/components/invoice/InvoiceBreakdown";
import type { invoiceBreakdown } from "@/lib/invoice-breakdown";
import { paymentLabels } from "@/lib/payment-methods";

export function CustomerInvoicesView() {
  const [history, setHistory] = useState<string[]>([]);
  const query = useCustomerInvoice(history.at(-1));
  const invoices: InvoiceSummary[] = query.data?.invoices || [];
  return <><CustomerPageHeading eyebrow="THE DETAILS, KEPT TOGETHER" title="Invoices & payments" description="Your service invoices, itemized costs, and payment records. Payment availability is always checked against the current invoice." /><CustomerState loading={query.isLoading} error={query.isError && !query.data} empty={!invoices.length && !query.isError} emptyFooter={<CursorPager history={history} change={setHistory} nextCursor={query.data?.nextCursor} />} retry={() => query.refetch()} message="Your invoices will appear here when they’re issued by the service team."><div className="space-y-4">{invoices.map(invoice => <article className="customer-panel flex flex-col gap-4 sm:flex-row sm:items-center" key={invoice._id}><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-brand-teal-dark"><FileText className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{invoice.invoiceNumber}</h2><p className="mt-1 text-xs text-muted-foreground">Issued {dateTime(invoice.issuedAt || invoice.createdAt)}</p></div><div><StatusBadge status={invoice.status} /><p className="mt-2 text-sm font-bold">{money(invoice.grandTotal, invoice.currency)}</p></div><Link href={`/customer/invoice/${invoice._id}`} className="public-button public-button-outline">View invoice <ArrowUpRight className="size-4" /></Link></article>)}</div><CursorPager history={history} change={setHistory} nextCursor={query.data?.nextCursor} /></CustomerState></>;
}
export function CustomerInvoiceView({ id }: { id: string }) {
  const query = useCustomerInvoiceById(id);
  const data = query.data as
    | {
        invoice: InvoiceDetail;
        customer?: CustomerIdentity;
        canPay: boolean;
        breakdown: ReturnType<typeof invoiceBreakdown>;
      }
    | undefined;
  const invoice = data?.invoice;
  const bookingId =
    invoice?.bookingId &&
    (typeof invoice.bookingId === "string"
      ? invoice.bookingId
      : invoice.bookingId._id);
  return (
    <>
      <CustomerPageHeading
        eyebrow="YOUR SERVICE INVOICE"
        title={invoice?.invoiceNumber || "Invoice details"}
        back="/customer/invoice"
      />
      <CustomerState
        loading={query.isLoading}
        error={query.isError && !data}
        retry={() => query.refetch()}
      >
        {invoice && data && (
          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="customer-panel min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Invoice breakdown
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Issued {dateTime(invoice.issuedAt || invoice.createdAt)}
                  </p>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
              <InvoiceBreakdown
                breakdown={data.breakdown}
                currency={invoice.currency}
                payment={invoice}
              />
              {invoice.notes && (
                <p className="mt-6 break-words border-t border-border pt-5 text-sm leading-7 text-muted-foreground">
                  {invoice.notes}
                </p>
              )}
            </section>
            <aside className="min-w-0 space-y-5">
              <section className="customer-panel">
                <h2 className="text-sm font-bold">Payment information</h2>
                {invoice.paymentMethod && <p className="mt-3 text-sm">{paymentLabels[invoice.paymentMethod] || invoice.paymentMethod}</p>}
                <p className="mb-5 mt-3 text-sm leading-7 text-muted-foreground">
                  {invoice.status === "paid"
                    ? "This invoice is paid. Your payment record is kept with this invoice."
                    : invoice.status === "draft"
                      ? "This invoice is a draft."
                      : invoice.status === "cancelled"
                        ? "This invoice is cancelled."
                        : data.canPay
                          ? "The payable amount is confirmed by the server at checkout."
                          : "Open the related booking to review how this bill is being paid."}
                </p>
                {data.canPay && !query.isError && (
                  <CustomerPayBtn
                    disabled={query.isFetching}
                    invoiceId={id}
                    customerName={data.customer?.name}
                    customerEmail={data.customer?.email}
                    customerPhone={data.customer?.phone}
                  />
                )}
                {query.isError && (
                  <p role="alert" className="mb-4 text-sm text-primary">
                    Current payment state could not be confirmed. Refresh before
                    paying.
                  </p>
                )}
                <button
                  className="public-text-link mt-4"
                  onClick={() => query.refetch()}
                >
                  Refresh invoice
                </button>
                {invoice.paymentReceivedAt && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Payment recorded {dateTime(invoice.paymentReceivedAt)}
                  </p>
                )}
              </section>
              <section className="customer-panel space-y-3">
                <a
                  href={`/api/invoices/${id}/pdf`}
                  className="public-button public-button-outline w-full"
                >
                  Download invoice PDF
                </a>
                {bookingId && (
                  <Link
                    href={`/customer/bookings/${bookingId}`}
                    className="public-button public-button-outline w-full"
                  >
                    View related booking
                  </Link>
                )}
              </section>
            </aside>
          </div>
        )}
      </CustomerState>
    </>
  );
}
