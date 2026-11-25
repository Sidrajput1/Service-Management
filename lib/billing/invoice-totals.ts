export function calculateInvoiceTotals(
  items: { amount?: number; taxable?: boolean }[],
  taxPercent: number,
) {
  const subtotal = items.reduce(
    (total, item) => total + Number(item.amount || 0),
    0,
  );
  const taxableAmount = items.reduce(
    (total, item) => total + (item.taxable ? Number(item.amount || 0) : 0),
    0,
  );
  const taxAmount =
    Math.round(((taxableAmount * Number(taxPercent || 0)) / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxableAmount, taxAmount, grandTotal };
}
