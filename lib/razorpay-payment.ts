import Invoice from "@/models/invoice";
import { connectToDb } from "./db";
import Payment from "@/models/payment";
import Job from "@/models/job";

type SourceType = 'web' | 'callback';
export async function finalizeSuccessfulRazorpayPayment(input:{
    invoiceId?:string;
     orderId?: string;
  paymentId?: string;
  paymentLinkId?: string;
  amountPaise: number;
  method?: string;
  source: SourceType;
  rawPayload?: Record<string, any>;
}){
    await connectToDb();

    const invoice =
    (input.invoiceId && (await Invoice.findById(input.invoiceId))) ||
    (input.orderId && (await Invoice.findOne({ razorpayOrderId: input.orderId }))) ||
    (input.paymentLinkId && (await Invoice.findOne({ razorpayPaymentLinkId: input.paymentLinkId })));

  if (!invoice) {
    throw new Error("Invoice not found for Razorpay payment");
  }

  // Idempotency: skip if the same Razorpay payment already exists
  if (input.paymentId) {
    const existingPayment = await Payment.findOne({ gatewayTxnId: input.paymentId });
    if (existingPayment) {
      return { invoice, payment: existingPayment, duplicate: true };
    }
  }

  const amount = Math.max(0, Math.round((input.amountPaise || 0) / 100 * 100) / 100);
  const credit = Math.min(amount, Number(invoice.balanceDue || 0) || amount);

  const payment = await Payment.create({
    invoiceId: invoice._id,
    jobId: invoice.jobId,
    customerId: invoice.customerId,
    amount: credit,
    mode: input.method || "upi",
    gateway: "razorpay",
    gatewayTxnId: input.paymentId || input.orderId || input.paymentLinkId,
    status: "success",
    paymentDate: new Date(),
    metadata: {
      source: input.source,
      rawPayload: input.rawPayload || {},
    },
  });

  invoice.amountPaid = Math.round((Number(invoice.amountPaid || 0) + credit) * 100) / 100;
  invoice.balanceDue = Math.max(0, Math.round((Number(invoice.grandTotal || 0) - invoice.amountPaid) * 100) / 100);
  invoice.status = invoice.balanceDue === 0 ? "paid" : "partial";
  invoice.paymentMethod = input.method || invoice.paymentMethod;
  invoice.paymentReceivedAt = new Date();
  if (input.paymentId) invoice.razorpayPaymentId = input.paymentId;
  if (input.orderId) invoice.razorpayOrderId = input.orderId;
  if (input.paymentLinkId) invoice.razorpayPaymentLinkId = input.paymentLinkId;
  await invoice.save();

  if (invoice.jobId) {
    const job = await Job.findById(invoice.jobId);
    if (job) {
      job.paymentStatus = invoice.balanceDue === 0 ? "paid" : "partial";
      job.paymentMethod = input.method || job.paymentMethod;
      job.paymentReceivedAt = new Date();
      await job.save();
    }
  }

  return { invoice, payment, duplicate: false };
}