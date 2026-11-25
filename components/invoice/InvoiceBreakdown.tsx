import type { invoiceBreakdown } from "@/lib/invoice-breakdown";
import { money } from "@/lib/customer-types";

export function InvoiceBreakdown({
  breakdown,
  currency,
  payment,
}: {
  breakdown: ReturnType<typeof invoiceBreakdown>;
  currency?: string;
  payment?: { amountPaid: number; balanceDue: number };
}) {
  const {
    items,
    rows,
    promotion,
    pricesIncludeDiscount,
    unreconciledDiscount,
  } = breakdown;
  return (
    <div className="min-w-0 space-y-4 text-sm">
      {promotion && (
        <p className="break-words rounded-lg bg-muted/60 px-3 py-2">
          <span className="font-semibold">Applied offer</span> · {promotion}
        </p>
      )}
      {pricesIncludeDiscount && (
        <p className="text-xs text-muted-foreground">
          Line prices include the discount shown in the totals.
        </p>
      )}
      <ul aria-label="Invoice line items" className="divide-y divide-border">
        {items.map((item, index) => (
          <li
            key={index}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 py-2.5"
          >
            <p className="min-w-0 break-words font-medium">
              {item.description}
            </p>
            <span className="text-right tabular-nums">
              {money(item.amount, currency)}
            </span>
            <p className="col-span-2 text-xs text-muted-foreground">
              {item.qty} × {money(item.unitPrice, currency)} per unit
            </p>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-border pt-3">
        {rows.map(({ label, amount }, index) => (
          <div
            key={label}
            className={`flex justify-between gap-3 ${index === rows.length - 1 ? "border-t border-border pt-3 font-semibold" : ""}`}
          >
            <dt>{label}</dt>
            <dd className="shrink-0 text-right tabular-nums">
              {money(amount, currency)}
            </dd>
          </div>
        ))}
        {payment && (
          <>
            <div className="flex justify-between gap-3">
              <dt>Amount paid</dt>
              <dd className="tabular-nums">
                {money(payment.amountPaid, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Balance due</dt>
              <dd className="tabular-nums">
                {money(payment.balanceDue, currency)}
              </dd>
            </div>
          </>
        )}
      </dl>
      {unreconciledDiscount && (
        <p className="text-xs text-muted-foreground">
          This older invoice lacks a verifiable discount breakdown. The saved
          total is shown above.
        </p>
      )}
    </div>
  );
}
