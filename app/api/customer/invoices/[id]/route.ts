import { NextResponse } from "next/server";

import { requireCustomer } from "@/lib/customer";

import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import "@/models/job";
import "@/models/booking";
import "@/models/customer";
import "@/models/ServiceProvider";
import "@/models/ServiceOffering";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Job from "@/models/job";
import { invoiceCanStartCheckout } from "@/lib/invoice-online-payment";
import { invoiceBreakdown } from "@/lib/invoice-breakdown";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateHeaders } from "@/lib/api-response";
import type { Types } from "mongoose";

export const runtime = "nodejs";

// export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
//   try {
//     await connectToDb();
//     const { customer } = await requireCustomerProfile();
//     const {id} = await params;

//     const invoice = await Invoice.findById(id)
//       .populate("jobId")
//       .populate("bookingId")
//       .populate("customerId");

//     if (!invoice) {
//       return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
//     }

//     if (String(invoice.customerId?._id || invoice.customerId) !== String(customer._id)) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     return NextResponse.json({ invoice });
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Server error" },
//       { status: err.status || 500 }
//     );
//   }
// }

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const session =
      await getServerSession(authOptions);

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

    const { customer } =
      await requireCustomer(
        session.user.id,
      );

    const id = objectIdSchema.parse((await params).id);

    const invoice =
      await Invoice.findOne({
        _id: id,
        customerId:
          customer._id,
      })
        .select("invoiceNumber jobId bookingId customerId status currency items subtotal discountAmount taxPercent taxAmount grandTotal amountPaid balanceDue notes issuedAt dueDate paymentMethod paymentReceivedAt createdAt quotePricingSource appliedPromotion completionBilling razorpayOrderId razorpayPaymentId razorpayPaymentLinkId razorpayCheckoutChannel")
        .populate<{ bookingId: { _id: Types.ObjectId; pricing?: import("@/models/booking").IBooking["pricing"] } | null }>(
          "bookingId",
          "serviceType scheduledAt address pricing status serviceProviderId serviceOfferingId",
        )
        .lean();

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

    const bookingId = invoice.bookingId?._id;
    const job =
      await Job.findOne({
        _id: invoice.jobId,
        bookingId,
      })
        .select(
          "_id status paymentStatus technicianId",
        )
        .lean();

    const canPay = await invoiceCanStartCheckout({ ...invoice, bookingId });
    delete invoice.razorpayOrderId;
    delete invoice.razorpayPaymentId;
    delete invoice.razorpayPaymentLinkId;
    delete invoice.razorpayCheckoutChannel;
    return NextResponse.json({
      success: true,

      invoice: {
        ...invoice,
        items: invoice.items.map(({ itemType, description, qty, unitPrice, amount, taxable }) =>
          ({ itemType, description, qty, unitPrice, amount, taxable })),
      },
      breakdown: invoiceBreakdown(invoice, invoice.bookingId?.pricing),

      job,

      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },

      canPay,
    }, { headers: privateHeaders });
  } catch (error) { return apiFailure(error); }
}
