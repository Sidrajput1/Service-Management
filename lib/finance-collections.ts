import mongoose, { type ClientSession, type Types } from "mongoose";
import {
  CommissionCollection,
  FinanceLedger,
  FinanceEvent,
  CollectionReminder,
  type CommissionCollectionData,
} from "@/models/finance";
import Payment from "@/models/payment";
import ServiceProvider from "@/models/ServiceProvider";
import {
  createRazorpayPaymentLink,
  findRazorpayPaymentLink,
  getRazorpayPaymentLink,
  cancelRazorpayPaymentLink,
  getRazorpayPayment,
  type GatewayPaymentLink,
} from "./razorpay";
import {
  financeTransaction,
  lockLedger,
  type FinanceActor,
} from "./finance-ledger";
import {
  ledgerBalances,
  weekKey,
  reminderText,
  sumPaise,
} from "./finance-policy.mjs";
import { createNotification } from "./notification";
import { ApiAuthError } from "./auth";
import { requireFinanceReady } from "./finance-readiness";

function verifyLink(
  link: GatewayPaymentLink,
  record: CommissionCollectionData,
) {
  if (
    link.reference_id !== record.reference ||
    link.currency !== "INR" ||
    link.amount !== record.amountPaise ||
    !/^plink_[A-Za-z0-9]+$/.test(link.id) ||
    (record.gatewayLinkId && link.id !== record.gatewayLinkId)
  )
    throw new ApiAuthError(
      "The payment link does not match the saved collection. Ask an admin to review it.",
      409,
    );
  const url = new URL(link.short_url);
  if (
    url.protocol !== "https:" ||
    !(
      url.hostname === "rzp.io" ||
      url.hostname === "razorpay.com" ||
      url.hostname.endsWith(".razorpay.com")
    )
  )
    throw new ApiAuthError("The payment link address needs review.", 409);
}
export async function createCollectionLink(
  actor: FinanceActor,
  providerId: Types.ObjectId,
  requestId: string,
) {
  // Reserve ledger balances before the network request; uncertain requests retain the same reference.
  const result = await financeTransaction(
    actor,
    "collection_link_requested",
    requestId,
    { providerId: String(providerId) },
    async (session) => {
      const active = await CommissionCollection.findOne({
        activeKey: String(providerId),
      }).session(session);
      if (active)
        return {
          result: { collectionId: active._id },
          event: {
            providerId,
            resourceId: active._id,
            details: { reused: true },
          },
        };
      const rows = await FinanceLedger.find({
        providerId,
        collectionId: { $exists: false },
      })
        .sort({ dueAt: 1, _id: 1 })
        .limit(1000)
        .session(session);
      const allocations = [];
      const id = new mongoose.Types.ObjectId();
      let amountPaise = 0;
      for (const candidate of rows) {
        const row = await lockLedger(candidate._id, session, providerId),
          balance = ledgerBalances(row);
        if (!balance.commissionDuePaise) continue;
        allocations.push({
          ledgerId: row._id,
          amountPaise: balance.commissionDuePaise,
        });
        amountPaise += balance.commissionDuePaise;
        if (!Number.isSafeInteger(amountPaise))
          throw new ApiAuthError("The collection amount needs review.", 409);
        row.collectionId = id;
        row.collectionReservedPaise = balance.commissionDuePaise;
        await row.save({ session });
        if (allocations.length === 100) break;
      }
      if (amountPaise < 100)
        throw new ApiAuthError(
          "At least ₹1 of confirmed commission must be due to create a payment link.",
          409,
        );
      await CommissionCollection.create(
        [
          {
            _id: id,
            providerId,
            activeKey: String(providerId),
            reference: `sc_${id}`,
            amountPaise,
            allocations,
            status: "creating",
            expiresAt: new Date(Date.now() + 7 * 86400000),
            createdBy: actor._id,
          },
        ],
        { session },
      );
      return {
        result: { collectionId: id },
        event: {
          providerId,
          resourceId: id,
          amountPaise,
          details: { allocationCount: allocations.length },
        },
      };
    },
  );
  const id =
    result && "collectionId" in result
      ? result.collectionId
      : result && "resourceId" in result
        ? result.resourceId
        : null;
  if (!id)
    throw new ApiAuthError("The collection request did not complete.", 409);
  let record = await CommissionCollection.findOne({ _id: id, providerId });
  if (!record) throw new ApiAuthError("Collection not found", 404);
  if (record.status !== "creating") return { collection: record };
  let link: GatewayPaymentLink | null;
  try {
    link = await findRazorpayPaymentLink(record.reference);
    if (!link) {
      try {
        link = await createRazorpayPaymentLink({
          amountPaise: record.amountPaise,
          currency: "INR",
          description: "Servizato commission collection",
          reference_id: record.reference,
          notes: {
            collectionId: String(record._id),
            providerId: String(providerId),
            purpose: "servizato_commission",
          },
          suppressNotifications: true,
          expireBy: Math.floor(record.expiresAt.getTime() / 1000),
        });
      } catch {
        link = await findRazorpayPaymentLink(record.reference);
        if (!link) throw new Error("Link creation uncertain");
      }
    }
  } catch {
    throw new ApiAuthError(
      "Payment Links are currently unavailable. The collection is saved; retry this request to check the same reference. No email or WhatsApp reminder was sent.",
      503,
    );
  }
  if (!link)
    throw new ApiAuthError("Payment link preparation is still pending.", 503);
  verifyLink(link, record);
  record =
    (await CommissionCollection.findOneAndUpdate(
      { _id: record._id, status: "creating" },
      {
        $set: {
          gatewayLinkId: link.id,
          gatewayOrderId: link.order_id || undefined,
          shortUrl: link.short_url,
          status: "active",
          lastCheckedAt: new Date(),
        },
      },
      { new: true },
    )) || record;
  return { collection: record };
}
async function releaseReservation(
  record: CommissionCollectionData,
  session: ClientSession,
) {
  for (const allocation of record.allocations)
    await FinanceLedger.updateOne(
      { _id: allocation.ledgerId, collectionId: record._id },
      {
        $unset: { collectionId: 1 },
        $set: { collectionReservedPaise: 0 },
        $inc: { version: 1 },
      },
      { session },
    );
}
export async function reconcileCollection(
  collectionId: string,
  providerId?: Types.ObjectId,
) {
  await requireFinanceReady();
  const record = await CommissionCollection.findOne({
    _id: collectionId,
    ...(providerId ? { providerId } : {}),
  });
  if (!record) throw new ApiAuthError("Collection not found", 404);
  if (record.refundedPaise > 0)
    return {
      collection: record,
      review: record.status !== "paid",
      duplicate: true,
    };
  let link: GatewayPaymentLink | null;
  try {
    link = record.gatewayLinkId
      ? await getRazorpayPaymentLink(record.gatewayLinkId)
      : await findRazorpayPaymentLink(record.reference);
  } catch {
    throw new ApiAuthError(
      "The payment provider is unavailable. No balance was changed; try again.",
      503,
    );
  }
  if (!link)
    throw new ApiAuthError(
      "The saved link reference has not been found yet. Retry preparation for this collection.",
      409,
    );
  verifyLink(link, record);
  let payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    order_id?: string;
  } | null = null;
  if (link.status === "paid") {
    const captured = (link.payments || []).filter(
      (row) => row.status === "captured",
    );
    if (
      link.amount_paid !== record.amountPaise ||
      captured.length !== 1 ||
      captured[0].amount !== record.amountPaise
    )
      throw new ApiAuthError(
        "This payment needs review. Partial or multiple payments are not allocated automatically.",
        409,
      );
    payment = await getRazorpayPayment(captured[0].payment_id);
    if (
      !payment ||
      payment.id !== captured[0].payment_id ||
      payment.amount !== record.amountPaise ||
      payment.currency !== "INR" ||
      payment.status !== "captured" ||
      !link.order_id ||
      payment.order_id !== link.order_id
    )
      throw new ApiAuthError(
        "The captured payment does not match this collection.",
        409,
      );
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const current = await CommissionCollection.findOneAndUpdate(
        { _id: record._id },
        { $inc: { __v: 1 } },
        { new: true, session },
      );
      if (!current) throw new ApiAuthError("Collection not found", 404);
      current.gatewayLinkId = link.id;
      current.gatewayOrderId = link.order_id || undefined;
      current.shortUrl = link.short_url;
      current.lastCheckedAt = new Date();
      if (current.status === "paid")
        return { collection: current, duplicate: true };
      if (["cancelled", "expired"].includes(link.status)) {
        if (link.amount_paid > 0) {
          current.status = "review";
          await current.save({ session });
          return { collection: current, review: true };
        }
        await releaseReservation(current, session);
        current.status = link.status as "cancelled" | "expired";
        current.activeKey = undefined;
        await current.save({ session });
        await FinanceEvent.updateOne(
          { dedupeKey: `collection-closed:${current._id}` },
          {
            $setOnInsert: {
              kind: "collection_closed",
              actorRole: "gateway",
              providerId: current.providerId,
              resourceId: current._id,
              details: { status: current.status },
            },
          },
          { upsert: true, session },
        );
        return { collection: current };
      }
      if (!payment) {
        let eligible = true;
        for (const allocation of current.allocations) {
          const row = await FinanceLedger.findById(allocation.ledgerId).session(
            session,
          );
          if (
            !row ||
            ledgerBalances(row).commissionDuePaise < allocation.amountPaise
          )
            eligible = false;
        }
        current.status =
          link.status === "created" && eligible ? "active" : "review";
        await current.save({ session });
        return { collection: current };
      }
      if (
        await Payment.exists({
          gateway: "razorpay",
          gatewayTxnId: payment.id,
        }).session(session)
      )
        throw new ApiAuthError(
          "This payment is already associated with a customer invoice.",
          409,
        );
      const duplicate = await FinanceEvent.findOne({
        externalKey: `razorpay-payment:${payment.id}`,
      }).session(session);
      if (duplicate && String(duplicate.resourceId) !== String(current._id))
        throw new ApiAuthError(
          "This payment was already used for another collection.",
          409,
        );
      if (!duplicate)
        await FinanceEvent.create(
          [
            {
              dedupeKey: `collection-captured:${payment.id}`,
              externalKey: `razorpay-payment:${payment.id}`,
              kind: "commission_payment_captured",
              actorRole: "gateway",
              providerId: current.providerId,
              resourceId: current._id,
              amountPaise: payment.amount,
              details: { gatewayLinkId: link.id },
            },
          ],
          { session },
        );
      const rows = [];
      let canAllocate = true;
      for (const allocation of current.allocations) {
        const row = await lockLedger(
          allocation.ledgerId,
          session,
          current.providerId,
        );
        rows.push({ row, allocation });
        if (
          String(row.collectionId) !== String(current._id) ||
          ledgerBalances(row).commissionDuePaise < allocation.amountPaise
        )
          canAllocate = false;
      }
      current.gatewayPaymentId = payment.id;
      current.paidAt = new Date();
      if (!canAllocate) {
        current.status = "review";
        await current.save({ session });
        return { collection: current, review: true };
      }
      for (const { row, allocation } of rows) {
        row.collectedPaise += allocation.amountPaise;
        row.collectionId = undefined;
        row.collectionReservedPaise = 0;
        await row.save({ session });
      }
      current.status = "paid";
      current.activeKey = undefined;
      await current.save({ session });
      await FinanceEvent.create(
        [
          {
            dedupeKey: `collection-allocated:${current._id}`,
            kind: "commission_collection_allocated",
            actorRole: "gateway",
            providerId: current.providerId,
            resourceId: current._id,
            amountPaise: payment.amount,
            details: {
              allocations: current.allocations.map((row) => ({
                ledgerId: String(row.ledgerId),
                amountPaise: row.amountPaise,
              })),
            },
          },
        ],
        { session },
      );
      return { collection: current };
    });
  } finally {
    await session.endSession();
  }
}
export async function cancelCollectionLink(
  actor: FinanceActor,
  id: string,
  reason: string,
  requestId: string,
) {
  if (actor.role !== "admin")
    throw new ApiAuthError("Admin access required", 403);
  await requireFinanceReady();
  const collection = await CommissionCollection.findById(id);
  if (!collection) throw new ApiAuthError("Collection not found", 404);
  let link = collection.gatewayLinkId
    ? await getRazorpayPaymentLink(collection.gatewayLinkId)
    : await findRazorpayPaymentLink(collection.reference);
  if (!link)
    throw new ApiAuthError(
      "The gateway reference is still uncertain. Retry link preparation before cancelling.",
      409,
    );
  verifyLink(link, collection);
  if (link.status === "created") {
    try {
      link = await cancelRazorpayPaymentLink(link.id);
    } catch {
      link = await getRazorpayPaymentLink(link.id);
    }
  }
  if (!["cancelled", "expired"].includes(link.status) || link.amount_paid > 0)
    throw new ApiAuthError(
      "The link cannot be closed because a payment may exist. Reconcile it for review.",
      409,
    );
  const result = await reconcileCollection(id);
  await financeTransaction(
    actor,
    "collection_cancelled_by_admin",
    requestId,
    { id, reason },
    async () => ({
      result: { cancelled: true },
      event: {
        providerId: collection.providerId,
        resourceId: collection._id,
        reason,
        details: { gatewayLinkId: link.id },
      },
    }),
  );
  return result;
}
export async function prepareWeeklyReminders(actor?: FinanceActor) {
  await requireFinanceReady();
  const rows = FinanceLedger.find({
    paymentMode: { $in: ["cash", "direct_upi"] },
    dueAt: { $lte: new Date() },
  })
    .sort({ _id: 1 })
    .lean()
    .cursor();
  const groups = new Map<
    string,
    { providerId: Types.ObjectId; amountPaise: number; dueAt: Date }
  >();
  for await (const row of rows) {
    const b = ledgerBalances(row);
    if (!b.overdue) continue;
    const key = String(row.providerId),
      previous = groups.get(key);
    groups.set(key, {
      providerId: row.providerId,
      amountPaise: sumPaise([previous?.amountPaise || 0, b.commissionDuePaise]),
      dueAt:
        previous && previous.dueAt < row.dueAt! ? previous.dueAt : row.dueAt!,
    });
  }
  let delivered = 0;
  for (const group of groups.values()) {
    const reminder = await CollectionReminder.findOneAndUpdate(
      { providerId: group.providerId, week: weekKey() },
      {
        $setOnInsert: {
          amountPaise: group.amountPaise,
          dueAt: group.dueAt,
          preparedBy: actor?._id,
        },
      },
      { upsert: true, new: true },
    );
    if (reminder.deliveredAt) continue;
    const provider = await ServiceProvider.findById(group.providerId)
      .select("ownerId")
      .lean();
    if (!provider) continue;
    // Recompute now; an old prepared snapshot must never assert a paid/disputed balance is still due.
    const latest = await FinanceLedger.find({
      providerId: group.providerId,
    }).lean();
    const due = sumPaise(
      latest.map((row) => {
        const balance = ledgerBalances(row);
        return balance.overdue ? balance.commissionDuePaise : 0;
      }),
    );
    if (!due) continue;
    await createNotification({
      recipientUserId: String(provider.ownerId),
      title: "Commission payment reminder",
      message: reminderText(due),
      type: "payment",
      actionUrl: "/service-provider/finance/earnings",
      dedupeKey: `commission-reminder:${group.providerId}:${reminder.week}`,
      channel: "in_app",
    });
    reminder.deliveredAt = new Date();
    await reminder.save();
    delivered++;
  }
  return { week: weekKey(), providersPrepared: groups.size, delivered };
}
