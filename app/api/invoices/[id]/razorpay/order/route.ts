import { requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import { createRazorpayOrder } from "@/lib/razorpay";
import Customer from "@/models/customer";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Technician from "@/models/technician";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDb();

    const user = await requireCurrentUser();

    const { id } = await params;

    const invoice = await Invoice.findById(id)
      .populate("jobId")
      .populate("customerId");

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
      });
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Invoice already paid" },
        { status: 400 },
      );
    }

    // admin dispatcher can create it , technician can create only foir assignerd job

     const isAdminOrDispatcher = ["admin", "dispatcher"].includes(user.role);
    let allowed = isAdminOrDispatcher;

    if (user.role === "technician") {
      const tech = await Technician.findOne({ userId: user._id });

      if (!tech) {
        return NextResponse.json(
          { error: "Technician profile not found" },
          { status: 404 },
        );
      }

      const job = await Job.findById(invoice.jobId);

      if (job && String(job.technicianId) === String(tech._id)) {
        // return NextResponse.json(
        //   { error: "Unauthorized to creatre order for this invoice" },
        //   { status: 403 },
        // );
        allowed = true;
      }
     } 

     if (user.role === "customer") {
      const customer = await Customer.findOne({ userId: user._id });
      if (!customer || String(invoice.customerId?._id || invoice.customerId) !== String(customer._id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
     //else if (!["admin", "dispatcher"].includes(user.role)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    // }

    // if (invoice.razorpayOrderId) {
    //   return NextResponse.json({
    //     order: {
    //       id: invoice.razorpayOrderId,
    //       amount: Math.round(Number(invoice.balanceDue) * 100),
    //       currency: "INR",
    //     },

    //     keyId: process.env.RAZORPAY_KEY_ID,
    //     invoice,
    //   });
    // }

    // Always create new order
    invoice.razorpayOrderId = undefined;

//     if (invoice.status === "paid") {
//   throw new Error("Already paid");
// }

    console.log({
      subtotal: invoice.subtotal,
      grandTotal: invoice.grandTotal,
      balanceDue: invoice.balanceDue,
    });

    const amountPaise = Math.round(
      Number(invoice.balanceDue ?? invoice.grandTotal ?? 0) * 100,
    );

    if (amountPaise <= 0) {
      return NextResponse.json(
        { error: "Invalid invoice amount. Cannot create payment." },
        { status: 400 },
      );
    }
    console.log(
      "Creating Razorpay order for invoice",
      invoice._id,
      "amountPaise",
      amountPaise,
    );

    const order = await createRazorpayOrder({
      amountPaise,
      currency: "INR",
      receipt: invoice._id.toString(),
      notes: {
        invoiceId: invoice._id.toString(),
        jobId: invoice.jobId ? String(invoice.jobId) : "",
        customerId: invoice.customerId ? String(invoice.customerId) : "",
      },
    });

    invoice.razorpayOrderId = order.id;
    invoice.status = "issued";

   

    await invoice.save();

    return NextResponse.json({
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
      invoiceId: invoice._id,
      customer: invoice.customerId,
      job: invoice.jobId,
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
