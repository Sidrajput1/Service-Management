import { NextResponse } from "next/server";
import { z } from "zod";
import { getRazorpayPayment, verifyCheckoutSignature } from "@/lib/razorpay";
import { finalizeSuccessfulRazorpayPayment } from "@/lib/razorpay-payment";
import Invoice from "@/models/invoice";
import { connectToDb } from "@/lib/db";


export const runtime = "nodejs";

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const parsed = VerifySchema.parse(body);

//     const ok = verifyCheckoutSignature({
//       orderId: parsed.razorpay_order_id,
//       paymentId: parsed.razorpay_payment_id,
//       signature: parsed.razorpay_signature,
//     });

//     if (!ok) {
//       return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
//     }

//     const invoice = await Invoice.findOne({ razorpayOrderId: parsed.razorpay_order_id });
//     if (!invoice) {
//       return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
//     }

//     const expectedAmountPaise =
//   Math.round(
//     Number(invoice.balanceDue) *
//       100,
//   );

//     const result = await finalizeSuccessfulRazorpayPayment({
//       invoiceId: invoice._id.toString(),
//       orderId: parsed.razorpay_order_id,
//       paymentId: parsed.razorpay_payment_id,
//       paidAmountPaise: expectedAmountPaise,
//       expectedAmountPaise,
//       method: "checkout",
//       source: "callback",
//       rawPayload: body,
//     });

//     // const result = await finalizeSuccessfulRazorpayPayment({
//     //   invoiceId: invoice._id.toString(),
//     //   orderId: parsed.razorpay_order_id,
//     //   paymentId: parsed.razorpay_payment_id,
//     //   amountPaise: Math.round(Number(invoice.balanceDue || invoice.grandTotal || 0) * 100),
//     //   method: "checkout",
//     //   source: "callback",
//     //   rawPayload: body,
//     // });

//     return NextResponse.json({ ok: true, invoice: result.invoice, payment: result.payment });
//   } catch (err: any) {
//     if (err.name === "ZodError") {
//       return NextResponse.json({ error: err.errors }, { status: 400 });
//     }
//     return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
//   }
// }


// new route for verify razorpay payment


export async function POST(
  request: Request,
) {
  try {
    await connectToDb();

    const body =
      await request.json();

    const parsed =
      VerifySchema.parse(body);

    /*
     * 1. Verify Razorpay Checkout signature.
     */
    const signatureValid =
      verifyCheckoutSignature({
        orderId:
          parsed.razorpay_order_id,

        paymentId:
          parsed.razorpay_payment_id,

        signature:
          parsed.razorpay_signature,
      });

    if (!signatureValid) {
      return NextResponse.json(
        {
          error:
            "Invalid payment signature",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 2. Find invoice by Razorpay order.
     */
    const invoice =
      await Invoice.findOne({
        razorpayOrderId:
          parsed.razorpay_order_id,
      });

    if (!invoice) {
      return NextResponse.json(
        {
          error:
            "Invoice not found for this Razorpay order",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * 3. Already paid?
     *
     * Idempotent response.
     */
    if (
      invoice.status === "paid" ||
      Number(
        invoice.balanceDue || 0,
      ) <= 0
    ) {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        invoice,
      });
    }

    /*
     * 4. Ask Razorpay for the actual payment.
     *
     * This prevents us from trusting the amount
     * supplied by the browser.
     */
    const razorpayPayment =
      await getRazorpayPayment(
        parsed.razorpay_payment_id,
      );

    /*
     * 5. Payment must belong to the same order.
     */
    if (
      String(
        razorpayPayment.order_id,
      ) !==
      String(
        invoice.razorpayOrderId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Payment does not belong to this invoice order",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 6. Razorpay payment must be captured.
     */
    if (
      razorpayPayment.status !==
      "captured"
    ) {
      return NextResponse.json(
        {
          error:
            `Payment is not captured. Current status: ${razorpayPayment.status}`,
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 7. Verify currency.
     */
    if (
      String(
        razorpayPayment.currency ||
          "INR",
      ) !==
      String(
        invoice.currency ||
          "INR",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Payment currency mismatch",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 8. Expected amount from our invoice.
     */
    const expectedAmountPaise =
      Math.round(
        Number(
          invoice.balanceDue,
        ) * 100,
      );

    /*
     * 9. Actual amount from Razorpay.
     */
    const paidAmountPaise =
      Number(
        razorpayPayment.amount,
      );

    if (
      paidAmountPaise !==
      expectedAmountPaise
    ) {
      return NextResponse.json(
        {
          error:
            "Payment amount mismatch",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 10. Finalize payment.
     */
    const result =
      await finalizeSuccessfulRazorpayPayment(
        {
          invoiceId:
            invoice._id.toString(),

          orderId:
            parsed.razorpay_order_id,

          paymentId:
            parsed.razorpay_payment_id,

          paidAmountPaise,

          expectedAmountPaise,

          method:
            razorpayPayment.method ||
            "unknown",

          source:
            "callback",

          rawPayload:
            razorpayPayment,
        },
      );

    return NextResponse.json({
      ok: true,

      duplicate:
        result.duplicate ||
        false,

      invoice:
        result.invoice,

      payment:
        result.payment,
    });
  } catch (err: any) {
    console.error(
      "Razorpay verify error:",
      err,
    );

    if (
      err?.name ===
      "ZodError"
    ) {
      return NextResponse.json(
        {
          error:
            err.errors,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          err.message ||
          "Server error",
      },
      {
        status: 500,
      },
    );
  }
}
