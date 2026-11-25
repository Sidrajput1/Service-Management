import { InvoiceBreakdown } from "@/components/invoice/InvoiceBreakdown";
import type { RunningBill } from "@/lib/job-running-bill";

export function RunningBillPanel({ bill }: { bill: RunningBill }) {
  return (
    <section
      className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
      aria-label="Running bill"
    >
      <h2 className="font-semibold">Running bill</h2>
      <InvoiceBreakdown breakdown={bill.breakdown} currency="INR" />
      <p className="text-xs leading-6 text-muted-foreground">
        Recorded service and parts charges. Your final invoice will be available
        after the service is completed.
      </p>
    </section>
  );
}
