interface IInvoiceItem {
    qty?: number | string;
    uniPrice?: number | string;
    amount?: number | string;
}

export function calculateInvoiceTotal(items:IInvoiceItem[],discountAmount = 0 , taxPercent = 0){
    const safeItems = items.map((item) => ({
        ...item,
        qty:Number(item.qty || 0),
        unitPrice:Number(item.uniPrice || 0),
        amount:Number(item.amount || 0),
    }));

    const subtotal = safeItems.reduce((sum,item) =>  sum + Number(item.amount || 0),0);
    const safeDiscount = Math.max(0, Math.min(Number(discountAmount || 0), subtotal));
    const taxableBase = Math.max(0,Math.min(Number(discountAmount || 0),subtotal));

    const safeTaxPercent = Math.max(0,Number(taxPercent || 0));
    const taxAmount = (taxableBase * safeTaxPercent) / 100;

    const grandTotal = Math.round((taxableBase + taxAmount) * 100) / 100;

    return {
         subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(safeDiscount * 100) / 100,
    taxPercent: safeTaxPercent,
    taxAmount: Math.round(taxAmount * 100) / 100,
    grandTotal,
    };


};


export function generateInvoiceNumber() {
  const date = new Date();
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${d}-${random}`;
}

export function recomputeBalance(grandTotal: number, amountPaid: number) {
  const balanceDue = Math.max(0, Math.round((grandTotal - amountPaid) * 100) / 100);
  return balanceDue;
}