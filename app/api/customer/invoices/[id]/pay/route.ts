import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireCustomer } from "@/lib/customer";
import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,

  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    await connectToDb();

    const { customer } = await requireCustomer(session.user.id);

    const { id } = await params;

    const invoice = await Invoice.findOne({
      _id: id,
      customerId: customer._id,
    });

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice not found",
        },
        {
          status: 404,
        },
      );
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        {
          error: "Invoice is already paid",
        },
        {
          status: 400,
        },
      );
    }

    if (invoice.status === "cancelled") {
      return NextResponse.json(
        {
          error: "This invoice has been cancelled",
        },
        {
          status: 400,
        },
      );
    }

    const amount = Math.round(Number(invoice.balanceDue) * 100);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Invalid invoice balance",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Razorpay Order amount is in the
     * smallest currency unit.
     *
     * ₹566.40 = 56640 paise.
     */
    const receipt = `inv_${String(invoice._id).slice(-20)}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount,

      currency: invoice.currency || "INR",

      receipt,

      notes: {
        invoiceId: String(invoice._id),

        jobId: String(invoice.jobId),

        bookingId: String(invoice.bookingId),

        customerId: String(invoice.customerId),
      },
    });

    /*
     * Store the latest Razorpay order
     * against the invoice.
     */
    invoice.razorpayOrderId = order.id;

    await invoice.save();

    return NextResponse.json({
      success: true,

      keyId: process.env.RAZORPAY_KEY_ID,

      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },

      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        balanceDue: invoice.balanceDue,
      },

      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error: any) {
    console.error("Create Razorpay order error:", error);

    return NextResponse.json(
      {
        error:
          error.error?.description ||
          error.message ||
          "Unable to create payment order",
      },
      {
        status: 500,
      },
    );
  }
}
