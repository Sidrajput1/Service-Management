import mongoose from "mongoose";
import Invoice from "@/models/invoice";
import Payment from "@/models/payment";
import Job from "@/models/job";
import { connectToDb } from "./db";
import { ApiAuthError } from "./auth";
import { getJobNotificationRecipients } from "./notification-recipents";
import { notifyPaymentReceived } from "./notify-events";
import { canPayInvoice } from "./access-policy.mjs";
import { applyVerifiedInvoicePayment } from "./finance-ledger";
import { FinanceEvent } from "@/models/finance";
import { paise } from "./finance-policy.mjs";
import { financeReady } from "./finance-readiness";

type SourceType = "web" | "callback" | "webhook";
export async function finalizeSuccessfulRazorpayPayment(input: {
  invoiceId?: string;
  orderId?: string;
  paymentId?: string;
  paymentLinkId?: string;
  paidAmountPaise: number;
  expectedAmountPaise: number;
  method?: string;
  source: SourceType;
  rawPayload?: Record<string, unknown>;
}) {
  await connectToDb();
  const accountingReady = await financeReady();
  const session = await mongoose.startSession();
  try {
    // Both checkout callbacks and webhooks use this transaction. Concurrent delivery
    // retries against the invoice write, then observes the committed payment.
    const result = await session.withTransaction(async () => {
      const invoice =
        (input.invoiceId &&
          (await Invoice.findById(input.invoiceId).session(session))) ||
        (input.orderId &&
          (await Invoice.findOne({ razorpayOrderId: input.orderId }).session(
            session,
          ))) ||
        (input.paymentLinkId &&
          (await Invoice.findOne({
            razorpayPaymentLinkId: input.paymentLinkId,
          }).session(session)));
      if (!invoice) throw new ApiAuthError("Invoice not found", 404);
      if (!input.paymentId)
        throw new ApiAuthError(
          "A verified gateway payment reference is required",
          400,
        );
      if (
        input.orderId &&
        invoice.razorpayOrderId &&
        input.orderId !== invoice.razorpayOrderId &&
        !input.paymentLinkId
      )
        throw new ApiAuthError("Payment order does not match the invoice", 409);
      if (
        input.paymentLinkId &&
        invoice.razorpayPaymentLinkId &&
        input.paymentLinkId !== invoice.razorpayPaymentLinkId
      )
        throw new ApiAuthError("Payment link does not match the invoice", 409);
      if (input.paymentId) {
        const existing = await Payment.findOne({
          gateway: "razorpay",
          gatewayTxnId: input.paymentId,
        }).session(session);
        if (existing) {
          if (String(existing.invoiceId) !== String(invoice._id))
            throw new ApiAuthError(
              "Payment belongs to a different invoice",
              409,
            );
          return { invoice, payment: existing, duplicate: true };
        }
      }
      if (
        await FinanceEvent.exists({
          externalKey: `razorpay-payment:${input.paymentId}`,
        }).session(session)
      )
        throw new ApiAuthError(
          "Payment is already used for a commission collection",
          409,
        );
      const unallocated = !canPayInvoice(invoice);
      const balancePaise = unallocated
        ? paise(invoice.grandTotal)
        : paise(invoice.balanceDue);
      if (
        !Number.isSafeInteger(input.paidAmountPaise) ||
        input.paidAmountPaise <= 0 ||
        input.paidAmountPaise !== input.expectedAmountPaise ||
        input.paidAmountPaise !== balancePaise
      )
        throw new ApiAuthError(
          "Payment amount does not match the current invoice balance",
          409,
        );
      const credit = input.paidAmountPaise / 100;
      const method =
        input.method === "netbanking"
          ? "bank_transfer"
          : [
                "cash",
                "upi",
                "card",
                "wallet",
                "bank_transfer",
                "checkout",
              ].includes(input.method || "")
            ? input.method!
            : "other";
      const [payment] = await Payment.create(
        [
          {
            invoiceId: invoice._id,
            jobId: invoice.jobId,
            customerId: invoice.customerId,
            amount: credit,
            mode: method,
            gateway: "razorpay",
            gatewayTxnId: input.paymentId,
            status: "success",
            paidAt: new Date(),
            metadata: {
              source: input.source,
              serverVerified: true,
              unallocated,
            },
          },
        ],
        { session },
      );
      if (unallocated) {
        if (!accountingReady)
          throw new ApiAuthError(
            "An unexpected payment needs finance setup and review. Retry this verified delivery after setup.",
            503,
          );
        const row = await applyVerifiedInvoicePayment(
          invoice,
          input.paidAmountPaise,
          session,
        );
        if (!row)
          throw new ApiAuthError(
            "The unexpected payment needs a valid booking reference before review.",
            409,
          );
        row.billState = "disputed";
        row.disputeReason =
          "An additional or unexpected customer payment was received. Review it before any payout.";
        await row.save({ session });
        await FinanceEvent.create(
          [
            {
              dedupeKey: `unexpected-payment:${input.paymentId}`,
              externalKey: `razorpay-payment:${input.paymentId}`,
              kind: "unexpected_customer_payment",
              actorRole: "gateway",
              providerId: row.providerId,
              ledgerId: row._id,
              invoiceId: invoice._id,
              amountPaise: input.paidAmountPaise,
              details: {
                gatewayPaymentId: input.paymentId,
                requiresReview: true,
              },
            },
          ],
          { session },
        );
        return { invoice, payment, duplicate: false, unallocated: true };
      }
      invoice.amountPaid =
        Math.round((Number(invoice.amountPaid || 0) + credit) * 100) / 100;
      invoice.balanceDue = Math.max(
        0,
        Math.round((Number(invoice.grandTotal) - invoice.amountPaid) * 100) /
          100,
      );
      invoice.status = invoice.balanceDue === 0 ? "paid" : "partial";
      invoice.paymentMethod = input.method || invoice.paymentMethod;
      invoice.paymentReceivedAt = new Date();
      if (input.paymentId) invoice.razorpayPaymentId = input.paymentId;
      if (input.orderId) invoice.razorpayOrderId = input.orderId;
      if (input.paymentLinkId)
        invoice.razorpayPaymentLinkId = input.paymentLinkId;
      await invoice.save({ session });
      if (accountingReady) {
        const row = await applyVerifiedInvoicePayment(
          invoice,
          input.paidAmountPaise,
          session,
        );
        await FinanceEvent.create(
          [
            {
              dedupeKey: `customer-payment:${input.paymentId}`,
              externalKey: `razorpay-payment:${input.paymentId}`,
              kind: "customer_online_payment",
              actorRole: "gateway",
              providerId: row?.providerId,
              ledgerId: row?._id,
              invoiceId: invoice._id,
              amountPaise: input.paidAmountPaise,
              details: {
                gatewayPaymentId: input.paymentId,
                paymentRecordId: String(payment._id),
                source: input.source,
              },
            },
          ],
          { session },
        );
      }
      if (invoice.jobId)
        await Job.updateOne(
          { _id: invoice.jobId },
          {
            $set: {
              paymentStatus: invoice.balanceDue === 0 ? "paid" : "partial",
              paymentMethod: input.method || "other",
              paymentReceivedAt: invoice.paymentReceivedAt,
            },
          },
          { session },
        );
      return { invoice, payment, duplicate: false };
    });
    if (!result) throw new Error("Payment transaction did not complete");
    if (!result.duplicate && result.payment) {
      try {
        const { invoice, payment } = result;
        const recipients = invoice.jobId
          ? await getJobNotificationRecipients(String(invoice.jobId))
          : {
              customerUserId: null,
              providerUserId: null,
              technicianUserId: null,
            };
        await notifyPaymentReceived({
          customerUserId: recipients.customerUserId || undefined,
          providerUserId: recipients.providerUserId || undefined,
          technicianUserId: recipients.technicianUserId || undefined,
          invoiceId: String(invoice._id),
          invoiceNumber: invoice.invoiceNumber,
          paymentId: String(payment._id),
          amount: payment.amount,
          jobId: invoice.jobId ? String(invoice.jobId) : undefined,
          bookingId: invoice.bookingId ? String(invoice.bookingId) : undefined,
        });
      } catch {
        console.error("Payment saved; payment notification delivery failed.");
      }
    }
    return result;
  } finally {
    await session.endSession();
  }
}
