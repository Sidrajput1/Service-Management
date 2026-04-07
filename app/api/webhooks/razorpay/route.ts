import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { finalizeSuccessfulRazorpayPayment } from "@/lib/razorpay-payment";
import { connectToDb } from "@/lib/db";
import WebhookEvent from "@/models/WebhookEvent";
import Invoice from "@/models/invoice";


export const runtime = "nodejs";

function pickInvoiceId(payload: any) {
  return (
    payload?.payment_link?.entity?.notes?.invoiceId ||
    payload?.payment?.entity?.notes?.invoiceId ||
    payload?.order?.entity?.notes?.invoiceId ||
    payload?.payment_link?.entity?.reference_id ||
    payload?.order?.entity?.receipt ||
    null
  );
}

function pickPaymentId(payload: any) {
  return payload?.payment?.entity?.id || null;
}

function pickOrderId(payload: any) {
  return payload?.payment?.entity?.order_id || payload?.order?.entity?.id || null;
}

function pickPaymentLinkId(payload: any) {
  return payload?.payment_link?.entity?.id || null;
}

function pickAmountPaise(payload: any) {
  return (
    payload?.payment?.entity?.amount ||
    payload?.payment_link?.entity?.amount_paid ||
    payload?.order?.entity?.amount ||
    0
  );
}

function pickMethod(payload: any) {
  return payload?.payment?.entity?.method || "razorpay";
}

export async function POST(request: Request) {
  try {
    await connectToDb();

    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const eventId = request.headers.get("x-razorpay-event-id") || "";

    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    const valid = verifyWebhookSignature({ rawBody, signature });
    if (!valid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    console.log("Received Razorpay webhook:", {
      event: payload?.event,
      paymentId: pickPaymentId(payload),
    }
    );
    const eventName = payload?.event || "unknown";

    // Deduplicate webhook retries
    if (eventId) {
      const already = await WebhookEvent.findOne({ eventId });
      if (already) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    const isPaymentSuccess =
      eventName === "payment.captured" ||
      eventName === "order.paid" ||
      eventName === "payment_link.paid";

    if (eventId) {
      await WebhookEvent.create({
        provider: "razorpay",
        eventId,
        eventName,
        payload,
        status: isPaymentSuccess ? "processed" : "ignored",
      });
    }

    if (!isPaymentSuccess) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const invoiceId = pickInvoiceId(payload);
    const orderId = pickOrderId(payload);
    const paymentId = pickPaymentId(payload);
    const paymentLinkId = pickPaymentLinkId(payload);
    const amountPaise = pickAmountPaise(payload);
    const method = pickMethod(payload);

    const invoice =
      (invoiceId && (await Invoice.findById(invoiceId))) ||
      (orderId && (await Invoice.findOne({ razorpayOrderId: orderId }))) ||
      (paymentLinkId && (await Invoice.findOne({ razorpayPaymentLinkId: paymentLinkId })));

    if (!invoice) {
      return NextResponse.json({ ok: true, warning: "Invoice not found" });
    }

    const result = await finalizeSuccessfulRazorpayPayment({
      invoiceId: invoice._id.toString(),
      orderId: orderId || undefined,
      paymentId: paymentId || undefined,
      paymentLinkId: paymentLinkId || undefined,
      amountPaise: amountPaise || Math.round(Number(invoice.balanceDue || invoice.grandTotal || 0) * 100),
      method,
      source: "web",
      rawPayload: payload,
    });

    return NextResponse.json({
      ok: true,
      invoiceId: result.invoice._id,
      paymentId: result.payment?._id,
      duplicate: result.duplicate || false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}