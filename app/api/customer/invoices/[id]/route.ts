import { NextResponse } from "next/server";

import { requireCustomerProfile } from "@/lib/customer";

import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import "@/models/job";
import "@/models/booking";
import "@/models/customer";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDb();
    const { customer } = await requireCustomerProfile();
    const {id} = await params;

    const invoice = await Invoice.findById(id)
      .populate("jobId")
      .populate("bookingId")
      .populate("customerId");

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (String(invoice.customerId?._id || invoice.customerId) !== String(customer._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}