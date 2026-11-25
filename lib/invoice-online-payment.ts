import mongoose, { type ClientSession } from "mongoose";
import Invoice, { type IInvoice } from "@/models/invoice";
import Booking from "@/models/booking";
import Job from "@/models/job";
import JobQuote from "@/models/job-quote";
import Payment from "@/models/payment";
import { FinanceLedger, type FinanceLedgerData } from "@/models/finance";
import { canPayInvoice } from "./access-policy.mjs";
import { ApiAuthError } from "./auth";
import { assertInvoiceMatchesJob } from "./job-invoice-approval";

type Channel = NonNullable<IInvoice["razorpayCheckoutChannel"]>;
type PayableInvoice = Pick<
  IInvoice,
  | "_id"
  | "status"
  | "jobId"
  | "bookingId"
  | "customerId"
  | "items"
  | "grandTotal"
  | "discountAmount"
  | "taxAmount"
  | "taxPercent"
  | "quotePricingSource"
  | "balanceDue"
  | "amountPaid"
  | "razorpayPaymentId"
  | "paymentReceivedAt"
  | "razorpayOrderId"
  | "razorpayPaymentLinkId"
  | "razorpayCheckoutChannel"
  | "completionBilling"
>;

export async function invoiceCanStartCheckout(
  invoice: PayableInvoice,
  options: {
    channel?: Channel;
    allowStandalone?: boolean;
    bill?: FinanceLedgerData | null;
    session?: ClientSession;
  } = {},
) {
  const { channel = "order", allowStandalone, session, bill } = options;
  if (
    !canPayInvoice(invoice) ||
    Number(invoice.amountPaid || 0) > 0 ||
    invoice.razorpayPaymentId ||
    invoice.paymentReceivedAt ||
    (invoice.razorpayCheckoutChannel &&
      invoice.razorpayCheckoutChannel !== channel) ||
    (channel === "order"
      ? invoice.razorpayPaymentLinkId
      : invoice.razorpayOrderId)
  )
    return false;

  const row =
    bill === undefined
      ? await FinanceLedger.findOne({ invoiceId: invoice._id })
          .session(session ?? null)
          .lean()
      : bill;
  if (row?.billState === "disputed") return false;
  if (
    await Payment.exists({
      invoiceId: invoice._id,
      status: { $in: ["created", "success"] },
    }).session(session ?? null)
  )
    return false;
  if (!invoice.jobId || !invoice.bookingId)
    return Boolean(allowStandalone && !invoice.jobId && !invoice.bookingId);

  if (
    !row ||
    row.paymentMode !== "servizato_online" ||
    row.paymentState !== "unpaid" ||
    !(
      ["confirmed", "reviewed"].includes(row.billState) ||
      (invoice.completionBilling === true &&
        row.billState === "pending" &&
        row.invoiceVersion === 1)
    ) ||
    row.claimedCollectedPaise > 0 ||
    row.onlineReceivedPaise > 0 ||
    row.grossPaise !== Math.round(invoice.grandTotal * 100)
  )
    return false;

  const job = await Job.findOne({
    _id: invoice.jobId,
    bookingId: invoice.bookingId,
    status: "completed",
  })
    .select("+finalQuote")
    .session(session ?? null);
  if (
    !job ||
    (job.latestQuoteId &&
      (await JobQuote.exists({
        _id: job.latestQuoteId,
        jobId: job._id,
        status: "pending_customer_approval",
      }).session(session ?? null)))
  )
    return false;
  if (
    !(await Booking.exists({
      _id: invoice.bookingId,
      customerId: invoice.customerId,
      serviceProviderId: job.serviceProviderId,
      status: { $ne: "cancelled" },
    }).session(session ?? null))
  )
    return false;
  try {
    await assertInvoiceMatchesJob(invoice, job, session);
  } catch (error) {
    if (error instanceof ApiAuthError && [404, 409].includes(error.status))
      return false;
    throw error;
  }
  return true;
}

/** Both checkout entry points reserve the same invoice before calling the gateway. */
export async function saveCheckoutChannel(
  invoice: IInvoice,
  channel: Channel,
  allowStandalone: boolean,
  gateway?: { id: string; metadata?: IInvoice["metadata"] },
) {
  const reference =
    channel === "order" ? "razorpayOrderId" : "razorpayPaymentLinkId";
  const other =
    channel === "order" ? "razorpayPaymentLinkId" : "razorpayOrderId";
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const saved = await Invoice.findOneAndUpdate(
        {
          _id: invoice._id,
          status: { $in: ["issued", "partial"] },
          balanceDue: invoice.balanceDue,
          grandTotal: invoice.grandTotal,
          [other]: null,
          razorpayCheckoutChannel: { $in: [null, channel] },
          ...(gateway
            ? { [reference]: { $in: [invoice[reference] ?? null, gateway.id] } }
            : {}),
        },
        {
          $set: {
            razorpayCheckoutChannel: channel,
            ...(gateway ? { [reference]: gateway.id } : {}),
            ...(gateway?.metadata ? { metadata: gateway.metadata } : {}),
          },
          $inc: { __v: 1 },
        },
        { returnDocument: "after", session },
      );
      if (!saved)
        throw new ApiAuthError(
          "The invoice changed or another checkout is in use. Refresh and review the bill.",
          409,
        );
      if (saved.jobId && saved.bookingId)
        await FinanceLedger.updateOne(
          { invoiceId: saved._id },
          { $inc: { __v: 1 } },
          { session },
        );
      if (
        !(await invoiceCanStartCheckout(saved, {
          channel,
          allowStandalone,
          session,
        }))
      )
        throw new ApiAuthError(
          "Online payment is unavailable. Review the current bill and payment status.",
          409,
        );
      return saved;
    });
  } finally {
    await session.endSession();
  }
}
