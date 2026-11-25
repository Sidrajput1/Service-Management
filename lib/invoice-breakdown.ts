export type AppliedPromotion = { name?: string; code?: string };
type BookingPrice = {
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  quantity?: number;
  pricingModel?: string;
  offerName?: string;
};
type InvoiceLine = {
  itemType?: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  taxable?: boolean;
};
type InvoicePrice = {
  items: InvoiceLine[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  taxAmount: number;
  taxPercent: number;
  quotePricingSource?: "job";
  appliedPromotion?: AppliedPromotion | null;
};

const cents = (value: number) => Math.round(value * 100);
const close = (a: number, b: number) => Math.abs(a - b) <= 1;

function discountedService(
  invoice: InvoicePrice,
  booking?: BookingPrice | null,
) {
  if (
    !booking ||
    !(booking.discountAmount > 0) ||
    cents(invoice.discountAmount) !== cents(booking.discountAmount) ||
    !close(
      cents(booking.basePrice - booking.discountAmount),
      cents(booking.finalPrice),
    )
  )
    return -1;
  const qty = booking.pricingModel === "per_unit" ? booking.quantity || 1 : 1;
  const candidates = invoice.items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.itemType === "service" &&
        item.qty === qty &&
        close(cents(item.amount), cents(booking.finalPrice)) &&
        close(cents(item.unitPrice * item.qty), cents(booking.finalPrice)),
    );
  return candidates.length === 1 ? candidates[0].index : -1;
}

function hasNetPrices(invoice: InvoicePrice) {
  const net = cents(invoice.grandTotal) - cents(invoice.taxAmount);
  const subtotal = cents(invoice.subtotal);
  const discount = cents(invoice.discountAmount);
  if (invoice.quotePricingSource === "job") return close(subtotal, net);
  if (subtotal === net && subtotal - discount !== net) return true;
  if (close(subtotal - discount, net)) return false;
  return close(subtotal, net);
}

/** Used at finalization and when a legacy job invoice can be tied to its saved offer. */
export function invoicePromotionSnapshot(
  invoice: InvoicePrice,
  booking?: BookingPrice | null,
): AppliedPromotion | undefined {
  if (
    invoice.discountAmount <= 0 ||
    !hasNetPrices(invoice) ||
    discountedService(invoice, booking) === -1
  )
    return undefined;
  const name = booking?.offerName?.trim();
  return name ? { name } : undefined;
}

export function promotionLabel(promotion?: AppliedPromotion | null) {
  const name = promotion?.name?.trim(),
    code = promotion?.code?.trim();
  return name && code && name !== code ? `${name} (${code})` : name || code;
}

/**
 * Reconcile displayed rows from the stored total and tax. This is presentation
 * only. Never use the returned rows to determine checkout or ledger amounts.
 */
export function invoiceBreakdown(
  invoice: InvoicePrice,
  booking?: BookingPrice | null,
) {
  const net = cents(invoice.grandTotal) - cents(invoice.taxAmount);
  const subtotal = cents(invoice.subtotal);
  const recordedDiscount = Math.max(0, cents(invoice.discountAmount));
  const netLines = recordedDiscount > 0 && hasNetPrices(invoice);
  const discount =
    netLines || close(subtotal - recordedDiscount, net) ? recordedDiscount : 0;
  let discountedIndex = netLines ? discountedService(invoice, booking) : -1;
  const bookedLineIndex = discountedIndex;
  if (
    netLines &&
    discountedIndex < 0 &&
    (invoice.quotePricingSource === "job" || invoice.items.length === 1)
  ) {
    const service = invoice.items.filter((item) => item.itemType === "service");
    if (service.length === 1)
      discountedIndex = invoice.items.indexOf(service[0]);
  }
  const items = invoice.items.map(
    ({ itemType, description, qty, unitPrice, amount, taxable }, index) => {
      if (index === discountedIndex && qty > 0) {
        const original =
          bookedLineIndex === index && booking
            ? booking.basePrice
            : amount + invoice.discountAmount;
        amount = original;
        unitPrice = original / qty;
      }
      return { itemType, description, qty, unitPrice, amount, taxable };
    },
  );
  const pricesIncludeDiscount = netLines && discountedIndex < 0;
  const nonTaxable = invoice.items.filter((item) => item.taxable === false);
  const rows: Array<{ label: string; amount: number }> = [];
  if (discount) {
    const before = netLines ? subtotal + discount : subtotal;
    rows.push({ label: "Subtotal before discount", amount: before / 100 });
    rows.push({ label: "Discount", amount: -discount / 100 });
    if (net !== before - discount)
      rows.push({
        label: "Rounding adjustment",
        amount: (net - before + discount) / 100,
      });
  }
  rows.push({
    label: nonTaxable.length
      ? discount
        ? "Subtotal after discount"
        : "Subtotal before tax"
      : "Taxable subtotal",
    amount: net / 100,
  });
  if (nonTaxable.length && (!discount || netLines)) {
    const untaxed = cents(
      nonTaxable.reduce((sum, item) => sum + item.amount, 0),
    );
    const taxable = net - untaxed;
    // Some older manual invoices taxed every line. Use a split only if it
    // reconciles with their stored tax, without touching that tax amount.
    if (
      taxable >= 0 &&
      close(
        Math.round((taxable * invoice.taxPercent) / 100),
        cents(invoice.taxAmount),
      )
    ) {
      rows.push({ label: "Taxable portion", amount: taxable / 100 });
    }
  }
  rows.push({
    label: `Tax (${invoice.taxPercent}%)`,
    amount: invoice.taxAmount,
  });
  rows.push({ label: "Total payable", amount: invoice.grandTotal });
  return {
    items,
    rows,
    pricesIncludeDiscount,
    unreconciledDiscount: recordedDiscount > 0 && !discount,
    promotion: promotionLabel(
      invoice.appliedPromotion === undefined
        ? invoicePromotionSnapshot(invoice, booking)
        : invoice.appliedPromotion,
    ),
  };
}
