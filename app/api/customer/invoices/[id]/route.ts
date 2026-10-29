import { NextResponse } from "next/server";

import { requireCustomer, requireCustomerProfile } from "@/lib/customer";

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
import { canPayInvoice } from "@/lib/access-policy.mjs";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateHeaders } from "@/lib/api-response";

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
        .select("invoiceNumber jobId bookingId status currency items.description items.qty items.unitPrice items.amount subtotal discountAmount taxPercent taxAmount grandTotal amountPaid balanceDue notes issuedAt dueDate paymentMethod paymentReceivedAt createdAt")
        .populate(
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

    const job =
      await Job.findOne({
        _id: invoice.jobId,
        bookingId: invoice.bookingId,
      })
        .select(
          "_id status paymentStatus technicianId",
        )
        .lean();

    return NextResponse.json({
      success: true,

      invoice,

      job,

      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },

      canPay: canPayInvoice(invoice),
    }, { headers: privateHeaders });
  } catch (error) { return apiFailure(error); }
}