import { type Types } from "mongoose";
import {
  CommissionPolicy,
  CommissionCollection,
  ProviderPayoutProfile,
  CancellationCase,
  type FinanceLedgerData,
  type FinanceEventData,
} from "@/models/finance";
import ServiceProvider from "@/models/ServiceProvider";
import PriceItem from "@/models/PriceItem";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Payment from "@/models/payment";
import {
  financeTransaction,
  lockLedger,
  setCommissionDueDate,
  type FinanceActor,
} from "./finance-ledger";
import {
  adminFinanceActionSchema,
  payoutInputSchema,
} from "./finance-validation";
import {
  encryptPayout,
  decryptPayout,
  payoutRequestFingerprint,
} from "./finance-security";
import {
  commissionBasis,
  financeTermsVersion,
  invoiceAmounts,
  multiplyRate,
  ledgerBalances,
  sumPaise,
  paise,
} from "./finance-policy.mjs";
import { calculateInvoiceTotal } from "./billing";
import { calculateInvoiceTotals } from "@/lib/billing/generateInvoiceForJob";
import { ApiAuthError } from "./auth";
import type { z } from "zod";

export function auditDto(event: FinanceEventData) {
  return {
    _id: event._id,
    kind: event.kind,
    actorId: event.actorId,
    actorRole: event.actorRole,
    providerId: event.providerId,
    ledgerId: event.ledgerId,
    invoiceId: event.invoiceId,
    resourceId: event.resourceId,
    amountPaise: event.amountPaise,
    reason: event.reason,
    createdAt: event.createdAt,
    reference:
      typeof event.details?.reference === "string"
        ? event.details.reference
        : undefined,
    paidAt: event.details?.paidAt,
    policy:
      event.kind === "create_policy"
        ? { old: event.details.old, new: event.details.new }
        : undefined,
  };
}
export async function savePayoutProfile(
  actor: FinanceActor,
  providerId: Types.ObjectId,
  input: z.infer<typeof payoutInputSchema>,
) {
  return financeTransaction(
    actor,
    "payout_details_changed",
    input.requestId,
    {
      method: input.method,
      expectedVersion: input.expectedVersion,
      fingerprint: payoutRequestFingerprint(input),
    },
    async (session) => {
      const current = await ProviderPayoutProfile.findOne({ providerId })
        .select("+encrypted")
        .session(session);
      if ((current?.version || 0) !== input.expectedVersion)
        throw new ApiAuthError(
          "Payout details changed. Refresh before saving.",
          409,
        );
      const version = (current?.version || 0) + 1;
      const values: Record<string, string> =
        input.method === "bank"
          ? {
              holderName: input.holderName,
              accountNumber: input.accountNumber,
              ifsc: input.ifsc,
              bankName: input.bankName,
            }
          : { holderName: input.holderName, upiId: input.upiId };
      const encrypted = encryptPayout(
        values,
        `${providerId}:${version}:${input.method}`,
      );
      const masked =
        input.method === "bank"
          ? `Account ending ${input.accountNumber.slice(-4)}`
          : `${input.upiId.slice(0, 1)}***@${input.upiId.split("@")[1]}`;
      const profile = await ProviderPayoutProfile.findOneAndUpdate(
        { providerId, ...(current ? { version: current.version } : {}) },
        {
          $set: {
            method: input.method,
            bankName: input.method === "bank" ? input.bankName : undefined,
            masked,
            encrypted,
            version,
            status: "pending",
            changedBy: actor._id,
          },
          $unset: { reviewReason: 1, reviewedBy: 1, reviewedAt: 1 },
        },
        { upsert: !current, new: true, session },
      );
      if (!profile)
        throw new ApiAuthError("The payout details changed. Try again.", 409);
      return {
        result: { saved: true, version, masked },
        event: {
          providerId,
          resourceId: profile._id,
          details: {
            version,
            method: input.method,
            masked,
            encrypted,
            previousEncrypted: current?.encrypted,
            previousVersion: current?.version,
            previousMethod: current?.method,
            previousMasked: current?.masked,
          },
        },
      };
    },
  );
}
export async function adminFinanceOperation(
  actor: FinanceActor,
  input: z.infer<typeof adminFinanceActionSchema>,
) {
  if (actor.role !== "admin")
    throw new ApiAuthError("Admin access required", 403);
  return financeTransaction(
    actor,
    input.action,
    input.requestId,
    input,
    async (session) => {
      if (input.action === "create_policy") {
        const scopeKey = input.scope === "global" ? "global" : input.scopeKey;
        if (input.scope === "provider" && !/^[a-f\d]{24}$/i.test(scopeKey))
          throw new ApiAuthError("Choose a valid provider", 400);
        if (
          input.scope === "provider" &&
          !(await ServiceProvider.exists({ _id: scopeKey }).session(session))
        )
          throw new ApiAuthError("Provider not found", 404);
        if (
          input.scope === "category" &&
          !(await PriceItem.exists({
            categoryKey: scopeKey,
            itemType: "service",
            isActive: true,
          }).session(session))
        )
          throw new ApiAuthError("Choose an active catalog category", 400);
        if (
          new Date(input.effectiveAt).getTime() <
          new Date().setUTCHours(0, 0, 0, 0)
        )
          throw new ApiAuthError(
            "New rules cannot be backdated before today.",
            400,
          );
        const old = await CommissionPolicy.findOne({
          scope: input.scope,
          scopeKey,
        })
          .sort({ effectiveAt: -1, _id: -1 })
          .session(session)
          .lean();
        const [policy] = await CommissionPolicy.create(
          [
            {
              scope: input.scope,
              scopeKey,
              rateBps: input.rateBps,
              basis: commissionBasis,
              effectiveAt: new Date(input.effectiveAt),
              collectionDays: input.collectionDays,
              termsVersion: financeTermsVersion,
              createdBy: actor._id,
              reason: input.reason,
            },
          ],
          { session },
        );
        return {
          result: { policy },
          event: {
            resourceId: policy._id,
            reason: input.reason,
            details: {
              old: old
                ? {
                    policyId: old._id,
                    rateBps: old.rateBps,
                    effectiveAt: old.effectiveAt,
                    collectionDays: old.collectionDays,
                  }
                : null,
              new: {
                policyId: policy._id,
                scope: policy.scope,
                scopeKey,
                rateBps: policy.rateBps,
                basis: policy.basis,
                effectiveAt: policy.effectiveAt,
                collectionDays: policy.collectionDays,
              },
            },
          },
        };
      }
      if (
        input.action === "reveal_payout" ||
        input.action === "review_payout"
      ) {
        const profile = await ProviderPayoutProfile.findOne({
          providerId: input.providerId,
        })
          .select("+encrypted")
          .session(session);
        if (!profile) throw new ApiAuthError("No payout details saved", 404);
        if (input.action === "reveal_payout") {
          const details = decryptPayout(
            profile.encrypted,
            `${profile.providerId}:${profile.version}:${profile.method}`,
          );
          return {
            result: {
              payoutDetails: details,
              version: profile.version,
              method: profile.method,
            },
            event: {
              providerId: profile.providerId,
              resourceId: profile._id,
              reason: input.reason,
              details: { version: profile.version, masked: profile.masked },
            },
          };
        }
        if (profile.version !== input.expectedVersion)
          throw new ApiAuthError(
            "The provider changed these details. Review the latest version.",
            409,
          );
        profile.status = input.status;
        profile.reviewReason = input.reason;
        profile.reviewedBy = actor._id;
        profile.reviewedAt = new Date();
        await profile.save({ session });
        return {
          result: { reviewed: true },
          event: {
            providerId: profile.providerId,
            resourceId: profile._id,
            reason: input.reason,
            details: {
              version: profile.version,
              status: profile.status,
              masked: profile.masked,
            },
          },
        };
      }
      if (input.action === "review_cancellation") {
        const record = await CancellationCase.findOneAndUpdate(
          { _id: input.caseId },
          {
            $set: {
              reviewStatus: input.status,
              reviewReason: input.reason,
              reviewedBy: actor._id,
              reviewedAt: new Date(),
            },
          },
          { new: true, session },
        );
        if (!record) throw new ApiAuthError("Cancellation case not found", 404);
        return {
          result: { reviewed: true },
          event: {
            providerId: record.providerId,
            resourceId: record._id,
            reason: input.reason,
            details: { reviewStatus: input.status },
          },
        };
      }
      if (!("ledgerId" in input))
        throw new ApiAuthError(
          "Use the collection or reminder action route.",
          400,
        );
      const row = await lockLedger(input.ledgerId, session),
        invoice = await Invoice.findById(row.invoiceId).session(session);
      if (!invoice) throw new ApiAuthError("Invoice not found", 404);
      const base = {
        ledgerId: row._id,
        providerId: row.providerId,
        invoiceId: row.invoiceId,
        reason: input.reason,
      };
      if (
        input.action === "record_direct_refund" ||
        input.action === "record_manual_collection"
      ) {
        const paidAt = new Date(input.paidAt);
        if (
          paidAt > new Date(Date.now() + 300000) ||
          paidAt < invoice.createdAt
        )
          throw new ApiAuthError(
            "Use the actual payment date after the invoice was created.",
            400,
          );
        if (!["cash", "direct_upi"].includes(row.paymentMode || ""))
          throw new ApiAuthError(
            "This action applies only to direct-provider payments.",
            409,
          );
        if (input.action === "record_manual_collection") {
          const balance = ledgerBalances(row);
          if (
            row.collectionId ||
            !balance.ready ||
            input.amountPaise > balance.commissionDuePaise
          )
            throw new ApiAuthError(
              "Use an eligible outstanding balance and close any active collection link first.",
              409,
            );
          row.collectedPaise += input.amountPaise;
          await row.save({ session });
        } else {
          if (
            !["confirmed", "reviewed"].includes(row.billState) ||
            !["paid", "refunded"].includes(row.paymentState) ||
            input.amountPaise > row.grossPaise - row.refundedPaise
          )
            throw new ApiAuthError(
              "The refund exceeds the confirmed direct payment or still needs bill review.",
              409,
            );
          let remaining = input.amountPaise;
          const payments = await Payment.find({
            invoiceId: row.invoiceId,
            gateway: { $ne: "razorpay" },
            status: { $in: ["success", "refunded"] },
          })
            .sort({ _id: 1 })
            .session(session);
          for (const payment of payments) {
            const available =
                Math.round(payment.amount * 100) - (payment.refundedPaise || 0),
              credit = Math.min(remaining, available);
            if (credit <= 0) continue;
            payment.refundedPaise = (payment.refundedPaise || 0) + credit;
            if (payment.refundedPaise === Math.round(payment.amount * 100))
              payment.status = "refunded";
            await payment.save({ session });
            remaining -= credit;
          }
          if (remaining)
            throw new ApiAuthError(
              "Recorded payment receipts need reconciliation before this refund can be recorded.",
              409,
            );
          row.refundedPaise += input.amountPaise;
          row.paymentState =
            row.refundedPaise >= row.grossPaise ? "refunded" : "paid";
          invoice.refundedPaise =
            (invoice.refundedPaise || 0) + input.amountPaise;
          if (row.paymentState === "refunded") invoice.status = "refunded";
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
          if (row.collectionId)
            await CommissionCollection.updateOne(
              { _id: row.collectionId },
              { $set: { status: "review" } },
              { session },
            );
        }
        return {
          result: { recorded: true, balance: ledgerBalances(row) },
          event: {
            ...base,
            amountPaise: input.amountPaise,
            externalKey: `manual-reference:${input.reference.trim().toUpperCase()}`,
            details: {
              reference: input.reference,
              paidAt,
              actualMoneyMovementRecorded: true,
              automaticTransfer: false,
            },
          },
        };
      }
      if (input.action === "record_payout") {
        const balance = ledgerBalances(row);
        if (
          row.paymentMode !== "servizato_online" ||
          !balance.ready ||
          input.amountPaise > balance.payoutWaitingPaise
        )
          throw new ApiAuthError(
            "This payout exceeds the eligible online earnings waiting for payment.",
            409,
          );
        const profile = await ProviderPayoutProfile.findOneAndUpdate(
          {
            providerId: row.providerId,
            version: input.profileVersion,
            status: "verified",
          },
          { $inc: { __v: 1 } },
          { new: true, session },
        );
        if (!profile)
          throw new ApiAuthError(
            "Review and approve the latest payout details before recording payment.",
            409,
          );
        const paidAt = new Date(input.paidAt);
        if (
          paidAt > new Date(Date.now() + 300000) ||
          paidAt < invoice.createdAt
        )
          throw new ApiAuthError(
            "Use the actual payment date after the invoice was created.",
            400,
          );
        row.payoutPaidPaise += input.amountPaise;
        await row.save({ session });
        return {
          result: { recorded: true, balance: ledgerBalances(row) },
          event: {
            ...base,
            amountPaise: input.amountPaise,
            externalKey: `manual-reference:${input.reference.trim().toUpperCase()}`,
            details: {
              reference: input.reference,
              paidAt,
              profileVersion: profile.version,
              masked: profile.masked,
              method: profile.method,
            },
          },
        };
      }
      if (row.collectionId && input.action !== "review_bill")
        throw new ApiAuthError(
          "Review or cancel the active collection link before changing its reserved balance.",
          409,
        );
      if (input.action === "adjust_ledger") {
        if (input.payoutDeltaPaise !== 0)
          throw new ApiAuthError(
            "A separate payout adjustment needs an agreed funding rule, which is not configured. Use a commission correction or the refund review process.",
            409,
          );
        if (row.policyState !== "ready" || row.commissionPaise == null)
          throw new ApiAuthError(
            "A saved, accepted commission policy is required. Missing historical terms cannot be invented.",
            409,
          );
        const nextCommission =
            row.commissionPaise +
            row.commissionAdjustmentPaise +
            input.commissionDeltaPaise,
          nextPayoutAdjustment =
            row.payoutAdjustmentPaise + input.payoutDeltaPaise;
        if (
          !Number.isSafeInteger(nextCommission) ||
          nextCommission < 0 ||
          nextCommission > row.eligiblePaise ||
          !Number.isSafeInteger(nextPayoutAdjustment) ||
          Math.abs(nextPayoutAdjustment) > row.grossPaise
        )
          throw new ApiAuthError(
            "The adjustment is outside this bill's supported amount.",
            400,
          );
        row.commissionAdjustmentPaise += input.commissionDeltaPaise;
        row.payoutAdjustmentPaise = nextPayoutAdjustment;
        await row.save({ session });
        return {
          result: { adjusted: true, balance: ledgerBalances(row) },
          event: {
            ...base,
            details: {
              commissionDeltaPaise: input.commissionDeltaPaise,
              payoutDeltaPaise: input.payoutDeltaPaise,
            },
          },
        };
      }
      if (input.action === "review_bill") {
        if (input.resolution === "request_confirmation") {
          row.billState = "pending";
          row.confirmedAt = undefined;
          row.confirmedBy = undefined;
          row.invoiceVersion += 1;
        } else if (input.resolution === "verified_online") {
          if (
            row.paymentMode !== "servizato_online" ||
            row.onlineReceivedPaise -
              row.refundedPaise -
              (row.unallocatedRefundedPaise || 0) !==
              row.grossPaise - row.refundedPaise
          )
            throw new ApiAuthError(
              "A full server-verified online payment is required.",
              409,
            );
          row.billState = "reviewed";
          row.paymentState =
            row.refundedPaise >= row.grossPaise ? "refunded" : "paid";
        } else {
          if (
            !["cash", "direct_upi"].includes(row.paymentMode || "") ||
            row.claimedCollectedPaise !== row.grossPaise ||
            !input.reference?.trim() ||
            row.onlineReceivedPaise - (row.unallocatedRefundedPaise || 0) > 0
          )
            throw new ApiAuthError(
              "Review the direct-payment report and provide an evidence reference.",
              409,
            );
          if (
            Number(invoice.amountPaid) !== 0 &&
            Math.round(invoice.amountPaid * 100) !== row.grossPaise
          )
            throw new ApiAuthError(
              "Existing partial payments need reconciliation first.",
              409,
            );
          const receipts = await Payment.find({
            invoiceId: row.invoiceId,
            status: { $in: ["success", "refunded"] },
          }).session(session);
          const directReceipts = receipts.filter(
            (payment) => payment.gateway !== "razorpay",
          );
          const received = sumPaise(
            directReceipts.map((payment) => paise(payment.amount)),
          );
          if (
            received !== 0 &&
            (received !== row.grossPaise ||
              directReceipts.some(
                (payment) =>
                  payment.mode !==
                  (row.paymentMode === "cash" ? "cash" : "upi"),
              ) ||
              sumPaise(
                directReceipts.map((payment) => payment.refundedPaise || 0),
              ) !== row.refundedPaise)
          )
            throw new ApiAuthError(
              "Existing direct receipts need reconciliation before review.",
              409,
            );
          if (received === 0 && row.refundedPaise > 0)
            throw new ApiAuthError(
              "A refunded bill needs its original receipt before review.",
              409,
            );
          if (received === 0 && row.grossPaise > 0)
            await Payment.create(
              [
                {
                  invoiceId: row.invoiceId,
                  jobId: row.jobId,
                  customerId: row.customerId,
                  amount: row.grossPaise / 100,
                  mode: row.paymentMode === "cash" ? "cash" : "upi",
                  gateway: "provider_direct",
                  gatewayTxnId: `admin-review:${row._id}`,
                  status: "success",
                  paidAt: invoice.paymentReceivedAt || new Date(),
                  receivedBy: row.submittedBy,
                  metadata: {
                    source: "admin_review",
                    reviewedBy: String(actor._id),
                    reference: input.reference,
                  },
                },
              ],
              { session },
            );
          invoice.amountPaid = row.grossPaise / 100;
          invoice.balanceDue = 0;
          const paymentState =
            row.grossPaise === 0
              ? "not_required"
              : row.refundedPaise >= row.grossPaise
                ? "refunded"
                : "paid";
          invoice.status = paymentState === "refunded" ? "refunded" : "paid";
          invoice.paymentMethod = row.paymentMode;
          if (row.grossPaise > 0)
            invoice.paymentReceivedAt = invoice.paymentReceivedAt || new Date();
          await invoice.save({ session });
          await Job.updateOne(
            { _id: row.jobId },
            {
              $set: {
                paymentStatus: paymentState,
                paymentMethod: row.paymentMode,
                paymentReceivedAt: invoice.paymentReceivedAt,
              },
            },
            { session },
          );
          row.billState = "reviewed";
          row.paymentState = paymentState;
        }
        row.disputeReason = undefined;
        row.reviewedBy = actor._id;
        row.reviewedAt = new Date();
        row.reviewReason = input.reason;
        setCommissionDueDate(row);
        await row.save({ session });
        return {
          result: { reviewed: true },
          event: {
            ...base,
            details: {
              resolution: input.resolution,
              reference: input.reference,
              invoiceVersion: row.invoiceVersion,
              customerApprovalFabricated: false,
            },
          },
        };
      }
      if (input.action === "correct_bill") {
        if (
          row.payoutPaidPaise ||
          row.collectedPaise ||
          row.onlineReceivedPaise ||
          Number(invoice.amountPaid) > 0 ||
          invoice.razorpayOrderId ||
          invoice.razorpayPaymentLinkId ||
          (await Payment.exists({
            invoiceId: row.invoiceId,
            status: "success",
          }).session(session))
        )
          throw new ApiAuthError(
            "Money or a checkout reference already exists. Use a refund and adjustment review; this bill cannot be rewritten.",
            409,
          );
        const old = {
          items: invoice.items.map((item) => ({
            description: item.description,
            itemType: item.itemType,
            qty: item.qty,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
          grandTotal: invoice.grandTotal,
          subtotal: invoice.subtotal,
          discountAmount: invoice.discountAmount,
          taxPercent: invoice.taxPercent,
          taxAmount: invoice.taxAmount,
          invoiceVersion: row.invoiceVersion,
        };
        invoice.items = input.items.map((item) => ({
          ...item,
          amount: Math.round(item.qty * item.unitPrice * 100) / 100,
        }));
        const mixedTax = input.items.some((item) => item.taxable === false);
        if (mixedTax && input.discountAmount > 0)
          throw new ApiAuthError(
            "Keep mixed-tax line prices net of any agreed discount. An extra shared discount needs a separate billing review.",
            400,
          );
        if (row.commissionAdjustmentPaise || row.payoutAdjustmentPaise)
          throw new ApiAuthError(
            "Review and reverse existing adjustments before correcting the bill.",
            409,
          );
        const totals = mixedTax
          ? {
              ...calculateInvoiceTotals(invoice.items, input.taxPercent),
              discountAmount: 0,
              taxPercent: input.taxPercent,
            }
          : calculateInvoiceTotal(
              invoice.items,
              input.discountAmount,
              input.taxPercent,
            );
        Object.assign(invoice, totals, {
          amountPaid: 0,
          balanceDue: totals.grandTotal,
          status: "issued",
        });
        const amounts = invoiceAmounts(invoice);
        Object.assign(row, amounts);
        if (row.policyState === "ready")
          row.commissionPaise = multiplyRate(
            row.eligiblePaise,
            row.snapshot.rateBps!,
          );
        row.invoiceVersion += 1;
        row.billState = "pending";
        row.claimedCollectedPaise = 0;
        row.paymentState = "unpaid";
        row.confirmedAt = undefined;
        row.confirmedBy = undefined;
        row.reviewReason = input.reason;
        row.reviewedBy = actor._id;
        row.reviewedAt = new Date();
        await invoice.save({ session });
        await row.save({ session });
        return {
          result: { corrected: true },
          event: {
            ...base,
            details: {
              old,
              new: {
                items: input.items,
                ...amounts,
                grandTotal: invoice.grandTotal,
                taxAmount: invoice.taxAmount,
                invoiceVersion: row.invoiceVersion,
              },
            },
          },
        };
      }
      throw new ApiAuthError("Unsupported finance action", 400);
    },
  );
}
export function ledgerDto(row: FinanceLedgerData) {
  return { ...row, ...ledgerBalances(row) };
}
