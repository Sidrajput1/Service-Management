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
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Job from "@/models/job";

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

    const { id } = await params;

    const invoice =
      await Invoice.findOne({
        _id: id,
        customerId:
          customer._id,
      })
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
        customerId: undefined,
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

      canPay:
        invoice.status !== "paid" &&
        invoice.status !== "cancelled" &&
        Number(invoice.balanceDue || 0) > 0,
    });
  } catch (error: any) {
    console.error(
      "Customer invoice error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load invoice",
      },
      {
        status: 500,
      },
    );
  }
} 
