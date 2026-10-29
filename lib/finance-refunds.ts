import mongoose from "mongoose";
import Invoice from "@/models/invoice";
import Payment from "@/models/payment";
import Job from "@/models/job";
import { CommissionCollection, FinanceEvent } from "@/models/finance";
import { ensureFinanceLedger, lockLedger } from "./finance-ledger";
import { getRazorpayPayment, getRazorpayRefund } from "./razorpay";
import { paise } from "./finance-policy.mjs";
import { ApiAuthError } from "./auth";
import { requireFinanceReady } from "./finance-readiness";

/** Records a processed gateway refund. This never initiates a refund or bank transfer. */
export async function recordVerifiedRefund(refundId: string) {
  await requireFinanceReady();
  const refund = await getRazorpayRefund(refundId);
  if (
    refund.id !== refundId ||
    refund.status !== "processed" ||
    !Number.isSafeInteger(refund.amount) ||
    refund.amount <= 0
  )
    throw new ApiAuthError("Refund is not verified as processed.", 409);
  const gatewayPayment = await getRazorpayPayment(refund.payment_id);
  if (
    gatewayPayment.id !== refund.payment_id ||
    gatewayPayment.currency !== "INR" ||
    !Number.isSafeInteger(gatewayPayment.amount_refunded) ||
    Number(gatewayPayment.amount_refunded) < refund.amount
  )
    throw new ApiAuthError("Refund payment details do not match.", 409);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      if (
        await FinanceEvent.exists({ dedupeKey: `refund:${refundId}` }).session(
          session,
        )
      )
        return { duplicate: true };
      const payment = await Payment.findOne({
        gateway: "razorpay",
        gatewayTxnId: refund.payment_id,
      }).session(session);
      if (payment) {
        const invoice = await Invoice.findById(payment.invoiceId).session(
          session,
        );
        if (!invoice) throw new ApiAuthError("Refund invoice not found", 409);
        const initial = await ensureFinanceLedger(invoice, session),
          row = await lockLedger(initial._id, session);
        const refunded = (payment.refundedPaise || 0) + refund.amount;
        if (
          refunded > paise(payment.amount) ||
          row.refundedPaise +
            (row.unallocatedRefundedPaise || 0) +
            refund.amount >
            row.onlineReceivedPaise
        )
          throw new ApiAuthError(
            "Refund exceeds the recorded customer payment.",
            409,
          );
        payment.refundedPaise = refunded;
        if (refunded === paise(payment.amount)) payment.status = "refunded";
        await payment.save({ session });
        const extraPayment = payment.metadata?.unallocated === true;
        if (extraPayment)
          row.unallocatedRefundedPaise =
            (row.unallocatedRefundedPaise || 0) + refund.amount;
        else row.refundedPaise += refund.amount;
        row.paymentState =
          row.refundedPaise >= row.grossPaise ? "refunded" : "paid";
        if (!extraPayment)
          invoice.refundedPaise = (invoice.refundedPaise || 0) + refund.amount;
        if ((invoice.refundedPaise || 0) >= paise(invoice.grandTotal))
          invoice.status = "refunded";
        await invoice.save({ session });
        await row.save({ session });
        await Job.updateOne(
          { _id: row.jobId },
          {
            $set: {
              paymentStatus:
                row.paymentState === "refunded" ? "refunded" : "paid",
            },
          },
          { session },
        );
        await FinanceEvent.create(
          [
            {
              dedupeKey: `refund:${refundId}`,
              externalKey: `razorpay-refund:${refundId}`,
              kind: "customer_refund_recorded",
              actorRole: "gateway",
              ledgerId: row._id,
              invoiceId: invoice._id,
              providerId: row.providerId,
              amountPaise: refund.amount,
              details: {
                paymentId: payment._id,
                gatewayPaymentId: refund.payment_id,
                refundId,
                refundAllocation: extraPayment
                  ? "unallocated_extra_payment"
                  : "proportional_original_commission",
                payoutRecoveryRequiresReview: row.payoutPaidPaise > 0,
                activeCollectionNeedsReview: Boolean(row.collectionId),
              },
            },
          ],
          { session },
        );
        if (row.collectionId)
          await CommissionCollection.updateOne(
            { _id: row.collectionId },
            { $set: { status: "review" } },
            { session },
          );
        return { recorded: true, invoiceId: invoice._id };
      }
      const collection = await CommissionCollection.findOne({
        $or: [
          { gatewayPaymentId: refund.payment_id },
          ...(gatewayPayment.order_id
            ? [{ gatewayOrderId: gatewayPayment.order_id }]
            : []),
        ],
      }).session(session);
      if (!collection)
        throw new ApiAuthError(
          "The original payment has not been reconciled. Retry the refund after payment processing.",
          409,
        );
      if (
        gatewayPayment.amount !== collection.amountPaise ||
        gatewayPayment.order_id !== collection.gatewayOrderId ||
        !(
          gatewayPayment.status === "captured" ||
          (gatewayPayment.status === "refunded" &&
            gatewayPayment.captured === true)
        )
      )
        throw new ApiAuthError(
          "Refund does not match a captured collection payment.",
          409,
        );
      if (!collection.gatewayPaymentId) {
        const used = await FinanceEvent.findOne({
          externalKey: `razorpay-payment:${refund.payment_id}`,
        }).session(session);
        if (used && String(used.resourceId) !== String(collection._id))
          throw new ApiAuthError(
            "Payment already belongs to another financial record.",
            409,
          );
        if (!used)
          await FinanceEvent.create(
            [
              {
                dedupeKey: `collection-captured:${refund.payment_id}`,
                externalKey: `razorpay-payment:${refund.payment_id}`,
                kind: "commission_payment_captured",
                actorRole: "gateway",
                providerId: collection.providerId,
                resourceId: collection._id,
                amountPaise: gatewayPayment.amount,
                details: {
                  refundArrivedBeforeCapture: true,
                  heldForReview: true,
                },
              },
            ],
            { session },
          );
        collection.gatewayPaymentId = refund.payment_id;
        collection.status = "review";
        collection.paidAt = new Date();
      }
      if (collection.refundedPaise + refund.amount > collection.amountPaise)
        throw new ApiAuthError("Refund exceeds the recorded collection.", 409);
      let remaining = refund.amount;
      const allocations = [];
      if (collection.status === "paid") {
        // Reverse the original allocation in its saved order, never another provider's balance.
        for (const allocation of collection.allocations) {
          const row = await lockLedger(
              allocation.ledgerId,
              session,
              collection.providerId,
            ),
            previousRefund = Math.max(
              0,
              collection.refundedPaise -
                collection.allocations
                  .slice(0, allocations.length)
                  .reduce((n, a) => n + a.amountPaise, 0),
            );
          const available = Math.max(
              0,
              allocation.amountPaise -
                Math.min(allocation.amountPaise, previousRefund),
            ),
            credit = Math.min(available, remaining);
          if (credit > row.collectedPaise)
            throw new ApiAuthError(
              "The collection refund allocation needs review.",
              409,
            );
          row.collectedPaise -= credit;
          await row.save({ session });
          remaining -= credit;
          allocations.push({ ledgerId: String(row._id), amountPaise: credit });
        }
        if (remaining)
          throw new ApiAuthError(
            "The collection refund allocation needs review.",
            409,
          );
      }
      collection.refundedPaise += refund.amount;
      if (
        collection.status === "review" &&
        collection.refundedPaise === collection.amountPaise
      ) {
        for (const allocation of collection.allocations) {
          const row = await lockLedger(
            allocation.ledgerId,
            session,
            collection.providerId,
          );
          if (String(row.collectionId) === String(collection._id)) {
            row.collectionId = undefined;
            row.collectionReservedPaise = 0;
            await row.save({ session });
          }
        }
        collection.activeKey = undefined;
      }
      await collection.save({ session });
      await FinanceEvent.create(
        [
          {
            dedupeKey: `refund:${refundId}`,
            externalKey: `razorpay-refund:${refundId}`,
            kind: "commission_collection_refund",
            actorRole: "gateway",
            providerId: collection.providerId,
            resourceId: collection._id,
            amountPaise: refund.amount,
            details: { refundId, allocations },
          },
        ],
        { session },
      );
      return { recorded: true, collectionId: collection._id };
    });
  } finally {
    await session.endSession();
  }
}
