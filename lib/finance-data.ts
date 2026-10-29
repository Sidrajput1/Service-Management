import { type QueryFilter, type Types } from "mongoose";
import {
  FinanceLedger,
  FinanceEvent,
  CommissionPolicy,
  FinanceTermsAcceptance,
  ProviderPayoutProfile,
  CommissionCollection,
  CollectionReminder,
  CancellationCase,
  type FinanceLedgerData,
} from "@/models/finance";
import ServiceProvider from "@/models/ServiceProvider";
import PriceItem from "@/models/PriceItem";
import Booking from "@/models/booking";
import Job from "@/models/job";
import {
  financeSummary,
  sumPaise,
  ledgerBalances,
  basisLabel,
  financeTermsVersion,
} from "./finance-policy.mjs";
import { payoutStorageReady } from "./finance-security";
import { ledgerDto, auditDto } from "./finance-operations";
import { objectIdSchema } from "./pagination";
import { ApiAuthError } from "./auth";
import { financeReady } from "./finance-readiness";

export async function financeData(
  request: Request,
  providerId?: Types.ObjectId,
) {
  const search = new URL(request.url).searchParams,
    filter: QueryFilter<FinanceLedgerData> = {};
  if (providerId) filter.providerId = providerId;
  else if (search.get("providerId"))
    filter.providerId = objectIdSchema.parse(search.get("providerId"));
  if (search.get("jobId"))
    filter.jobId = objectIdSchema.parse(search.get("jobId"));
  const paymentMode = search.get("paymentMode");
  if (paymentMode && paymentMode !== "all") {
    if (!["cash", "direct_upi", "servizato_online"].includes(paymentMode))
      throw new ApiAuthError("Invalid payment filter", 400);
    filter.paymentMode = paymentMode;
  }
  const from = search.get("from"),
    to = search.get("to");
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    for (const [key, value] of [
      ["$gte", from],
      ["$lt", to],
    ] as const)
      if (value) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value))
        )
          throw new ApiAuthError("Choose valid filter dates", 400);
        dateFilter[key] = new Date(
          Date.parse(value) + (key === "$lt" ? 86400000 : 0),
        );
      }
    filter.createdAt = dateFilter;
  }
  let rows = await FinanceLedger.find(filter)
    .sort({ _id: -1 })
    .limit(10001)
    .lean();
  if (rows.length > 10000)
    throw new ApiAuthError(
      "Choose a smaller date range or provider to review these records.",
      413,
    );
  const status = search.get("status");
  if (status && status !== "all") {
    if (
      ![
        "pending",
        "confirmed",
        "disputed",
        "reviewed",
        "due",
        "overdue",
        "payout_waiting",
        "refunded",
        "setup_needed",
      ].includes(status)
    )
      throw new ApiAuthError("Invalid status filter", 400);
    rows = rows.filter((row) => {
      const b = ledgerBalances(row);
      if (status === "due") return b.commissionDuePaise > 0;
      if (status === "overdue") return b.overdue;
      if (status === "payout_waiting") return b.payoutWaitingPaise > 0;
      if (status === "refunded")
        return row.refundedPaise > 0 || row.unallocatedRefundedPaise > 0;
      if (status === "setup_needed") return row.policyState !== "ready";
      return (
        row.billState === status ||
        (status === "pending" && row.billState === "not_submitted")
      );
    });
  }
  const cursor = search.get("cursor");
  if (cursor) objectIdSchema.parse(cursor);
  const page = (
    cursor ? rows.filter((row) => String(row._id) < cursor) : rows
  ).slice(0, 51);
  const ownScope = providerId ? { providerId } : {},
    eventScope = filter.providerId ? { providerId: filter.providerId } : {};
  const [
    policies,
    acceptances,
    profiles,
    collections,
    reminders,
    cancellations,
    events,
    providers,
    categories,
  ] = await Promise.all([
    CommissionPolicy.find(
      providerId
        ? {
            $or: [
              { scope: "global" },
              { scope: "category" },
              { scope: "provider", scopeKey: String(providerId) },
            ],
          }
        : {},
    )
      .sort({ effectiveAt: -1, _id: -1 })
      .limit(500)
      .lean(),
    providerId
      ? FinanceTermsAcceptance.find({ providerId }).lean()
      : Promise.resolve([]),
    ProviderPayoutProfile.find(ownScope).select("-encrypted").limit(500).lean(),
    CommissionCollection.find(ownScope).sort({ _id: -1 }).limit(100).lean(),
    CollectionReminder.find(ownScope).sort({ _id: -1 }).limit(100).lean(),
    providerId
      ? Promise.resolve([])
      : CancellationCase.find({
          ...(filter.providerId ? { providerId: filter.providerId } : {}),
        })
          .sort({ _id: -1 })
          .limit(100)
          .lean(),
    FinanceEvent.find(eventScope).sort({ _id: -1 }).limit(100).lean(),
    ServiceProvider.find(providerId ? { _id: providerId } : {})
      .select("companyName ownerId ratingSummary")
      .limit(500)
      .lean(),
    PriceItem.distinct("categoryKey", { itemType: "service", isActive: true }),
  ]);
  const collectionRows = await FinanceLedger.find(
    providerId
      ? { providerId }
      : filter.providerId
        ? { providerId: filter.providerId }
        : {},
  )
    .limit(10001)
    .lean();
  if (collectionRows.length > 10000)
    throw new ApiAuthError(
      "Choose a business to review its complete collection balance.",
      413,
    );
  const groups = new Map<
    string,
    {
      providerId: Types.ObjectId;
      amountPaise: number;
      oldestDueAt?: Date;
      overduePaise: number;
      lastReminderAt?: Date;
      activeCollectionId?: Types.ObjectId;
    }
  >();
  for (const row of collectionRows) {
    const b = ledgerBalances(row);
    if (!b.commissionDuePaise) continue;
    const key = String(row.providerId),
      old = groups.get(key);
    groups.set(key, {
      providerId: row.providerId,
      amountPaise: sumPaise([old?.amountPaise || 0, b.commissionDuePaise]),
      overduePaise: sumPaise([
        old?.overduePaise || 0,
        b.overdue ? b.commissionDuePaise : 0,
      ]),
      oldestDueAt:
        old?.oldestDueAt && row.dueAt && old.oldestDueAt < row.dueAt
          ? old.oldestDueAt
          : row.dueAt,
      lastReminderAt: reminders.find((r) => String(r.providerId) === key)
        ?.createdAt,
      activeCollectionId: collections.find(
        (c) => String(c.providerId) === key && c.activeKey,
      )?._id,
    });
  }
  const providerMetrics = providerId
    ? {
        completedJobs: await Job.countDocuments({
          serviceProviderId: providerId,
          status: "completed",
        }),
        repeatBookings: await Booking.countDocuments({
          serviceProviderId: providerId,
          repeatOfBookingId: { $exists: true },
        }),
        ratingSummary: providers[0]?.ratingSummary,
      }
    : undefined;
  return {
    summary: financeSummary(rows),
    rows: page.slice(0, 50).map(ledgerDto),
    total: rows.length,
    nextCursor: page.length > 50 ? String(page[49]._id) : null,
    policies,
    acceptances,
    profiles,
    collections,
    reminders,
    cancellations,
    events: events.map(auditDto),
    providers,
    categories: categories.filter(Boolean),
    collectionWork: [...groups.values()],
    basisLabel,
    termsVersion: financeTermsVersion,
    payoutStorageReady: payoutStorageReady(),
    setupWarning: !policies.some(
      (policy) => policy.scope === "global" && policy.effectiveAt <= new Date(),
    ),
    manualPayoutsOnly: true,
    providerMetrics,
    financeSetupReady: await financeReady(),
  };
}
