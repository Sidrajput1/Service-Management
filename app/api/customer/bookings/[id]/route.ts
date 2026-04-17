import { NextResponse } from "next/server";

import { requireCustomerProfile } from "@/lib/customer";

import { connectToDb } from "@/lib/db";
import { buildCustomerTimeline } from "@/lib/customer-timeline";
import Booking from "@/models/booking";
import Job from "@/models/job";
import Invoice from "@/models/invoice";
import Payment from "@/models/payment";
import Lead from "@/models/lead";
import "@/models/jobProof";
import "@/models/technician";


export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDb();
    const { customer } = await requireCustomerProfile();

    const {id} = await params;
    const booking = await Booking.findById(id)
      .populate("customerId")
      .populate("leadId")
      .lean();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (String((booking as any).customerId?._id || (booking as any).customerId) !== String(customer._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const job = await Job.findOne({ bookingId: booking._id })
      .populate({
        path: "technicianId",
        populate: { path: "userId" },
      })
      .populate("proofIds")
      .lean();

    const invoice = await Invoice.findOne({ bookingId: booking._id }).lean();

    const payment = invoice
      ? await Payment.findOne({
          invoiceId: invoice._id,
          status: "success",
        })
          .sort({ createdAt: -1 })
          .lean()
      : null;

    const lead = booking.leadId
      ? (await Lead.findById((booking as any).leadId))?._id
      : null;

    const timeline = buildCustomerTimeline({
      lead: booking.leadId || lead,
      booking,
      job,
      invoice,
      payment,
    });

    return NextResponse.json({
      booking,
      job,
      invoice,
      payment,
      timeline,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}