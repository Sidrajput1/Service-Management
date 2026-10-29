import Invoice from "@/models/invoice";
import { FinanceLedger } from "@/models/finance";
import { prepareInvoiceFinance } from "./finance-ledger";
import { requireFinanceReady } from "./finance-readiness";
export async function prepareOlderInvoices(after?: string, limit = 50) {
  await requireFinanceReady();
  const rows = await Invoice.find({
    ...(after ? { _id: { $gt: after } } : {}),
    jobId: { $exists: true },
    bookingId: { $exists: true },
  })
    .select("_id")
    .sort({ _id: 1 })
    .limit(limit)
    .lean();
  let prepared = 0,
    existing = 0,
    needsReview = 0,
    skipped = 0;
  for (const row of rows) {
    if (await FinanceLedger.exists({ invoiceId: row._id })) {
      existing++;
      continue;
    }
    try {
      const result = await prepareInvoiceFinance(row._id);
      if (result) prepared++;
      else skipped++;
    } catch {
      needsReview++;
    }
  }
  return {
    examined: rows.length,
    prepared,
    existing,
    needsReview,
    skipped,
    nextAfter: rows.length === limit ? String(rows.at(-1)!._id) : null,
    customerApprovalAdded: false,
    historicalRateInvented: false,
  };
}
