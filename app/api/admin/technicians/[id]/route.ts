import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Payment from "@/models/payment";
import Technician from "@/models/technician";
import { NextResponse } from "next/server";


export const runtime = "nodejs";

export async function GET(_: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();
    const {id} = await params;
    const technician = await Technician.findById(id).populate("userId");
    if (!technician) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    const jobs = await Job.find({ technicianId: technician._id })
      .populate("bookingId")
      .populate("invoiceId")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const payments = await Payment.find({ jobId: { $in: jobs.map((j: any) => j._id) }, status: "success" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      technician,
      jobs,
      payments,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function PATCH(request: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    await connectToDb();

    const {id} = await params;
    const body = await request.json();
    const { isActive, status } = body || {};

    const technician = await Technician.findById(id);
    if (!technician) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    if (typeof isActive === "boolean") {
      technician.isActive = isActive;
    }

    if (status) {
      technician.status = status;
    }

    await technician.save();

    return NextResponse.json({ technician });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}