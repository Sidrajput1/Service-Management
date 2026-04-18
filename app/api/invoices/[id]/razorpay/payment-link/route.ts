export const runtime = "nodejs";

import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import { createRazorpayPaymentLink } from "@/lib/razorpay";
import Invoice from "@/models/invoice";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "dispatcher"]);

    await connectToDb();

    const {id} = await params;
    const invoice = await Invoice.findById(id)
      .populate("jobId")
      .populate("customerId")
      .populate("bookingId");

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice not found",
        },
        { status: 404 },
      );
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        {
          error: "Invoice is already paid",
        },
        { status: 400 },
      );
    }

    if (invoice.razorpayPaymentLinkId) {
      return NextResponse.json({
        paymentLinkId: invoice.razorpayPaymentLinkId,
        shortUrl: invoice.metadata?.razorpayShortUrl || null,
      });
    }

    const customer = invoice.customerId as any;

    const booking = invoice.bookingId as any;

    const paymentLink = await createRazorpayPaymentLink({
      amountPaise: Math.round(
        Number(invoice.balanceDue || invoice.grandTotal || 0) * 100,
      ),
      currency: "INR",
      description: `Invoice ${invoice.invoiceNumber}`,
      reference_id: invoice._id.toString(),
      customer: {
        name: customer?.name,
        email: customer?.email,
        contact: customer?.phone,
      },
      notes: {
        invoiceId: invoice._id.toString(),
        jobId: invoice.jobId ? String(invoice.jobId) : "",
        bookingId: booking?._id ? String(booking._id) : "",
      },
    });

    invoice.razorpayPaymentLinkId = paymentLink.id;
    invoice.metadata = {
      ...(invoice.metadata || {}),
      razorpayShortUrl: paymentLink.short_url,
      razorpayRawPaymentLink: paymentLink,
    };
    await invoice.save();

    return NextResponse.json({
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
