import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { finalizeSuccessfulRazorpayPayment } from "@/lib/razorpay-payment";
import Invoice from "@/models/invoice";


export const runtime = "nodejs";

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = VerifySchema.parse(body);

    const ok = verifyCheckoutSignature({
      orderId: parsed.razorpay_order_id,
      paymentId: parsed.razorpay_payment_id,
      signature: parsed.razorpay_signature,
    });

    if (!ok) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const invoice = await Invoice.findOne({ razorpayOrderId: parsed.razorpay_order_id });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const result = await finalizeSuccessfulRazorpayPayment({
      invoiceId: invoice._id.toString(),
      orderId: parsed.razorpay_order_id,
      paymentId: parsed.razorpay_payment_id,
      amountPaise: Math.round(Number(invoice.balanceDue || invoice.grandTotal || 0) * 100),
      method: "checkout",
      source: "callback",
      rawPayload: body,
    });

    return NextResponse.json({ ok: true, invoice: result.invoice, payment: result.payment });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}