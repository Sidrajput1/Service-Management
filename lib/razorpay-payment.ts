import Invoice from "@/models/invoice";
import { connectToDb } from "./db";
import Payment from "@/models/payment";
import Job from "@/models/job";
import { getJobNotificationRecipients } from "./notification-recipents";
import { notifyPaymentReceived } from "./notify-events";

// type SourceType = 'web' | 'callback' | 'webhook';
// export async function finalizeSuccessfulRazorpayPayment(input:{
//     invoiceId?:string;
//      orderId?: string;
//   paymentId?: string;
//   paymentLinkId?: string;
//   amountPaise: number;
//   method?: string;
//   source: SourceType;
//   rawPayload?: Record<string, any>;
// }){
//     await connectToDb();

//     const invoice =
//     (input.invoiceId && (await Invoice.findById(input.invoiceId))) ||
//     (input.orderId && (await Invoice.findOne({ razorpayOrderId: input.orderId }))) ||
//     (input.paymentLinkId && (await Invoice.findOne({ razorpayPaymentLinkId: input.paymentLinkId })));

//   if (!invoice) {
//     throw new Error("Invoice not found for Razorpay payment");
//   }

//   // Idempotency: skip if the same Razorpay payment already exists
//   if (input.paymentId) {
//     const existingPayment = await Payment.findOne({ gatewayTxnId: input.paymentId });
//     if (existingPayment) {
//       return { invoice, payment: existingPayment, duplicate: true };
//     }
//   }

//   const amount = Math.max(0, Math.round((input.amountPaise || 0) / 100 * 100) / 100);
//   const credit = Math.min(amount, Number(invoice.balanceDue || 0) || amount);

//   const payment = await Payment.create({
//     invoiceId: invoice._id,
//     jobId: invoice.jobId,
//     customerId: invoice.customerId,
//     amount: credit,
//     mode: input.method || "upi",
//     gateway: "razorpay",
//     gatewayTxnId: input.paymentId || input.orderId || input.paymentLinkId,
//     status: "success",
//     paidAt: new Date(),
//     metadata: {
//       source: input.source,
//       rawPayload: input.rawPayload || {},
//     },
//   });

//   invoice.amountPaid = Math.round((Number(invoice.amountPaid || 0) + credit) * 100) / 100;
//   invoice.balanceDue = Math.max(0, Math.round((Number(invoice.grandTotal || 0) - invoice.amountPaid) * 100) / 100);
//   invoice.status = invoice.balanceDue === 0 ? "paid" : "partial";
//   invoice.paymentMethod = input.method || invoice.paymentMethod;
//   invoice.paymentReceivedAt = new Date();
//   if (input.paymentId) invoice.razorpayPaymentId = input.paymentId;
//   if (input.orderId) invoice.razorpayOrderId = input.orderId;
//   if (input.paymentLinkId) invoice.razorpayPaymentLinkId = input.paymentLinkId;
//   await invoice.save();

//   if (invoice.jobId) {
//     const job = await Job.findById(invoice.jobId);
//     if (job) {
//       job.paymentStatus = invoice.balanceDue === 0 ? "paid" : "partial";
//       job.paymentMethod = input.method || job.paymentMethod;
//       job.paymentReceivedAt = new Date();
//       await job.save();
//     }
//   }

//   return { invoice, payment, duplicate: false };
// }

// new function for finalize successful payment

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

  rawPayload?: Record<string, any>;
}) {
  await connectToDb();

  const invoice =
    (input.invoiceId && (await Invoice.findById(input.invoiceId))) ||
    (input.orderId &&
      (await Invoice.findOne({
        razorpayOrderId: input.orderId,
      }))) ||
    (input.paymentLinkId &&
      (await Invoice.findOne({
        razorpayPaymentLinkId: input.paymentLinkId,
      })));

  if (!invoice) {
    throw new Error("Invoice not found for Razorpay payment");
  }

  if (invoice.status === "paid" || Number(invoice.balanceDue || 0) <= 0) {
    return {
      invoice,
      payment: null,
      duplicate: true,
    };
  }

  if (input.paidAmountPaise !== input.expectedAmountPaise) {
    throw new Error(
      `Payment amount mismatch. Expected ${input.expectedAmountPaise} paise but received ${input.paidAmountPaise} paise.`,
    );
  }

  if (input.paymentId) {
    const existingPayment = await Payment.findOne({
      gatewayTxnId: input.paymentId,
    });

    if (existingPayment) {
      return {
        invoice,
        payment: existingPayment,
        duplicate: true,
      };
    }
  }

  const credit = Math.round((input.paidAmountPaise / 100) * 100) / 100;

  const payment = await Payment.create({
    invoiceId: invoice._id,

    jobId: invoice.jobId,

    customerId: invoice.customerId,

    amount: credit,

    mode: input.method || "unknown",

    gateway: "razorpay",

    gatewayTxnId: input.paymentId || input.orderId || input.paymentLinkId,

    status: "success",

    paidAt: new Date(),

    metadata: {
      source: input.source,

      rawPayload: input.rawPayload || {},
    },
  });

  invoice.amountPaid =
    Math.round((Number(invoice.amountPaid || 0) + credit) * 100) / 100;

  invoice.balanceDue = Math.max(
    0,

    Math.round((Number(invoice.grandTotal || 0) - invoice.amountPaid) * 100) /
      100,
  );

  invoice.status = invoice.balanceDue === 0 ? "paid" : "partial";

  invoice.paymentMethod = input.method || invoice.paymentMethod;

  invoice.paymentReceivedAt = new Date();

  if (input.paymentId) {
    invoice.razorpayPaymentId = input.paymentId;
  }

  if (input.orderId) {
    invoice.razorpayOrderId = input.orderId;
  }

  await invoice.save();

  if (invoice.jobId) {
    const job = await Job.findById(invoice.jobId);

    if (job) {
      job.paymentStatus = invoice.balanceDue === 0 ? "paid" : "partial";

      job.paymentMethod = input.method || job.paymentMethod;

      job.paymentReceivedAt = new Date();

      await job.save();
    }
  };

  // adding notification after payment finalized

  const recipients =
  invoice.jobId
    ? await getJobNotificationRecipients(
        invoice.jobId.toString(),
      )
    : {
        customerUserId: null,
        providerUserId: null,
        technicianUserId: null,
      };

await notifyPaymentReceived({
  customerUserId:
    recipients.customerUserId ||
    undefined,

  providerUserId:
    recipients.providerUserId ||
    undefined,

  technicianUserId:
    recipients.technicianUserId ||
    undefined,

  invoiceId:
    invoice._id.toString(),

  invoiceNumber:
    invoice.invoiceNumber,

  paymentId:
    payment._id.toString(),

  amount:
    credit,

  jobId:
    invoice.jobId
      ? invoice.jobId.toString()
      : undefined,

  bookingId:
    invoice.bookingId
      ? invoice.bookingId.toString()
      : undefined,
});

  return {
    invoice,
    payment,
    duplicate: false,
  };
}
