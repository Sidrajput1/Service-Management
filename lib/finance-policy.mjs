/** All new accounting values are integer INR paise; rates are integer basis points. */
export const commissionBasis = "invoice_before_tax";
export const financeTermsVersion = "2026-10-27-v1";
export const basisLabel =
  "Final invoice before tax, including service and parts, after existing discounts";
export function paise(value) {
  const number = Number(value);
  const result = Math.round(number * 100);
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(result) ||
    Math.abs(number * 100 - result) > 0.00001
  )
    throw new Error("Use a valid amount with at most two decimal places.");
  return result;
}
export function integerAmount(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid amount in paise.");
  return value;
}
export function sumPaise(values) {
  let sum = 0n;
  for (const value of values) sum += BigInt(integerAmount(value));
  if (sum > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("The amount exceeds the supported safe range.");
  return Number(sum);
}
export function multiplyRate(amount, rateBps) {
  integerAmount(amount);
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000)
    throw new Error("Commission must be between 0 and 100 percent.");
  return Number((BigInt(amount) * BigInt(rateBps) + 5000n) / 10000n);
}
export function invoiceAmounts(invoice) {
  if (invoice.currency !== "INR")
    throw new Error("Only INR invoices are supported for commission.");
  const grossPaise = paise(invoice.grandTotal),
    taxPaise = paise(invoice.taxAmount);
  if (taxPaise > grossPaise)
    throw new Error("Review the invoice tax and total.");
  return { grossPaise, eligiblePaise: grossPaise - taxPaise };
}
export function selectCommissionPolicy(
  policies,
  providerId,
  categoryKey,
  at = new Date(),
) {
  const priority = { provider: 3, category: 2, global: 1 };
  return (
    policies
      .filter(
        (row) =>
          new Date(row.effectiveAt) <= at &&
          (row.scope === "global" ||
            (row.scope === "provider" && row.scopeKey === String(providerId)) ||
            (row.scope === "category" &&
              categoryKey &&
              row.scopeKey === categoryKey)),
      )
      .sort(
        (a, b) =>
          priority[b.scope] - priority[a.scope] ||
          new Date(b.effectiveAt) - new Date(a.effectiveAt) ||
          String(b._id).localeCompare(String(a._id)),
      )[0] || null
  );
}
export function ledgerBalances(row, now = new Date()) {
  const ready =
    ["confirmed", "reviewed"].includes(row.billState) &&
    (row.paymentState === "paid" ||
      (row.paymentState === "not_required" && row.grossPaise === 0)) &&
    row.policyState === "ready" &&
    row.jobCompleted === true;
  const gross = integerAmount(row.grossPaise || 0),
    refunded = Math.min(gross, integerAmount(row.refundedPaise || 0));
  const originalCommission =
    row.commissionPaise == null ? null : integerAmount(row.commissionPaise);
  const adjustedCommission =
    originalCommission == null
      ? null
      : integerAmount(
          originalCommission + (row.commissionAdjustmentPaise || 0),
        );
  const reversal =
    adjustedCommission == null || !gross
      ? 0
      : Number(
          (BigInt(adjustedCommission) * BigInt(refunded) +
            BigInt(Math.floor(gross / 2))) /
            BigInt(gross),
        );
  const commission =
    originalCommission == null ? 0 : Math.max(0, adjustedCommission - reversal);
  const providerNet = Math.max(
    0,
    gross - refunded - commission + (row.payoutAdjustmentPaise || 0),
  );
  const direct = ["cash", "direct_upi"].includes(row.paymentMode);
  const commissionDuePaise =
    ready && direct ? Math.max(0, commission - (row.collectedPaise || 0)) : 0;
  const payoutWaitingPaise =
    ready && !direct
      ? Math.max(0, providerNet - (row.payoutPaidPaise || 0))
      : 0;
  return {
    ready,
    commissionEarnedPaise: ready ? commission : 0,
    commissionRetainedPaise: ready && !direct ? commission : 0,
    commissionCollectedPaise: direct ? row.collectedPaise || 0 : 0,
    commissionDuePaise,
    payoutWaitingPaise,
    payoutPaidPaise: row.payoutPaidPaise || 0,
    providerRetainedPaise: ready && direct ? providerNet : 0,
    providerRecoveryPaise: !direct
      ? Math.max(0, (row.payoutPaidPaise || 0) - providerNet)
      : 0,
    collectionCreditPaise: direct
      ? Math.max(0, (row.collectedPaise || 0) - commission)
      : 0,
    commissionReversedPaise: reversal,
    overdue:
      commissionDuePaise > 0 && Boolean(row.dueAt) && new Date(row.dueAt) < now,
    underReviewPaise:
      row.billState === "disputed" || row.policyState !== "ready"
        ? Math.max(
            0,
            gross - refunded,
            (row.onlineReceivedPaise || 0) -
              refunded -
              (row.unallocatedRefundedPaise || 0),
          )
        : 0,
  };
}
export function financeSummary(rows, now = new Date()) {
  const summary = {
    completedServicePaise: 0,
    commissionEarnedPaise: 0,
    commissionRetainedPaise: 0,
    commissionCollectedPaise: 0,
    commissionDuePaise: 0,
    payoutWaitingPaise: 0,
    payoutPaidPaise: 0,
    onlineReceivedPaise: 0,
    refundedPaise: 0,
    underReviewPaise: 0,
    overduePaise: 0,
    providerRecoveryPaise: 0,
    collectionCreditPaise: 0,
  };
  for (const row of rows) {
    const balance = ledgerBalances(row, now);
    summary.completedServicePaise += row.jobCompleted ? row.grossPaise : 0;
    for (const key of [
      "commissionEarnedPaise",
      "commissionRetainedPaise",
      "commissionCollectedPaise",
      "commissionDuePaise",
      "payoutWaitingPaise",
      "payoutPaidPaise",
      "underReviewPaise",
      "providerRecoveryPaise",
      "collectionCreditPaise",
    ])
      summary[key] += balance[key];
    summary.onlineReceivedPaise += row.onlineReceivedPaise || 0;
    summary.refundedPaise +=
      (row.refundedPaise || 0) + (row.unallocatedRefundedPaise || 0);
    if (balance.overdue) summary.overduePaise += balance.commissionDuePaise;
  }
  if (Object.values(summary).some((value) => !Number.isSafeInteger(value)))
    throw new RangeError(
      "The financial total exceeds the safe range. Choose a smaller date range.",
    );
  return summary;
}
export function weekKey(at = new Date()) {
  const date = new Date(at);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
export const cancellationReasons = {
  customer: {
    no_longer_needed: "I no longer need this service",
    details_different: "The price or service details were different",
    no_arrival: "The provider did not arrive",
    no_contact: "I could not reach the provider",
    other: "Another reason",
  },
  service_provider: {
    customer_unavailable: "The customer was unavailable",
    incorrect_details: "The address or service details were incorrect",
    outside_coverage: "The job is outside our coverage",
    unavailable: "We do not have the required availability",
    safety: "There is a safety concern",
    other: "Another reason",
  },
  technician: {
    customer_unavailable: "The customer was unavailable",
    incorrect_details: "The address or service details were incorrect",
    outside_coverage: "The job is outside my coverage",
    unavailable: "I am unavailable",
    safety: "There is a safety concern",
    other: "Another reason",
  },
  admin: {
    customer_request: "The customer requested cancellation",
    provider_request: "The provider requested cancellation",
    duplicate: "Duplicate booking",
    safety: "There is a safety concern",
    other: "Another reason",
  },
  dispatcher: {
    customer_request: "The customer requested cancellation",
    provider_request: "The provider requested cancellation",
    duplicate: "Duplicate booking",
    safety: "There is a safety concern",
    other: "Another reason",
  },
};
export function validCancellationReason(role, reason) {
  return Object.hasOwn(cancellationReasons[role] || {}, reason || "");
}
export function reminderText(amountPaise) {
  return `Your Servizato commission payment of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amountPaise / 100)} is due. Please review your payment details and complete the payment using the link provided.`;
}
