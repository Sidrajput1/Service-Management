/** Shared by the read-only deployment preflight and the explicit index installer. */
export const financeIndexDefinitions = [
  [
    "commissionpolicies",
    { scope: 1, scopeKey: 1, effectiveAt: 1 },
    { unique: true },
  ],
  ["financetermsacceptances", { providerId: 1, policyId: 1 }, { unique: true }],
  ["financeledgers", { invoiceId: 1 }, { unique: true }],
  ["financeevents", { dedupeKey: 1 }, { unique: true }],
  [
    "financeevents",
    { externalKey: 1 },
    {
      unique: true,
      partialFilterExpression: { externalKey: { $type: "string" } },
    },
  ],
  ["providerpayoutprofiles", { providerId: 1 }, { unique: true }],
  ["commissioncollections", { reference: 1 }, { unique: true }],
  [
    "commissioncollections",
    { activeKey: 1 },
    {
      unique: true,
      partialFilterExpression: { activeKey: { $type: "string" } },
    },
  ],
  [
    "commissioncollections",
    { gatewayLinkId: 1 },
    {
      unique: true,
      partialFilterExpression: { gatewayLinkId: { $type: "string" } },
    },
  ],
  [
    "commissioncollections",
    { gatewayPaymentId: 1 },
    {
      unique: true,
      partialFilterExpression: { gatewayPaymentId: { $type: "string" } },
    },
  ],
  ["collectionreminders", { providerId: 1, week: 1 }, { unique: true }],
  ["cancellationcases", { bookingId: 1 }, { unique: true }],
  [
    "payments",
    { gateway: 1, gatewayTxnId: 1 },
    {
      unique: true,
      partialFilterExpression: {
        gateway: { $type: "string" },
        gatewayTxnId: { $type: "string" },
      },
    },
  ],
  ["invoices", { jobId: 1 }, { unique: true }],
  [
    "notifications",
    { dedupeKey: 1 },
    {
      unique: true,
      partialFilterExpression: { dedupeKey: { $type: "string" } },
    },
  ],
];
function canonical(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, canonical(value[key])]),
      )
    : value;
}
export function matchingFinanceIndex(indexes, keys, options) {
  return indexes.some(
    (index) =>
      index.unique === true &&
      JSON.stringify(index.key) === JSON.stringify(keys) &&
      JSON.stringify(canonical(index.partialFilterExpression || {})) ===
        JSON.stringify(canonical(options.partialFilterExpression || {})),
  );
}
