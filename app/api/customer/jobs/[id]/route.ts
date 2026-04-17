import { NextResponse } from "next/server";

import { requireCustomerProfile } from "@/lib/customer";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import "@/models/technician";
import "@/models/booking";
import "@/models/invoice";
import "@/models/jobProof";


export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDb();
    const { customer } = await requireCustomerProfile();

    const {id} = await params;

    const job = await Job.findById(id)
      .populate({
        path: "bookingId",
        populate: { path: "customerId" },
      })
      .populate({
        path: "technicianId",
        populate: { path: "userId" },
      })
      .populate("invoiceId")
      .populate("proofIds");

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const jobCustomerId = String((job as any).bookingId?.customerId?._id || (job as any).bookingId?.customerId);
    if (jobCustomerId !== String(customer._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}