import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";

export async function GET(_: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const {id} = await params;
    const job = await Job.findById(id)
      .populate({
        path: "bookingId",
        populate: { path: "customerId" },
      })
      .populate("technicianId")
      .populate("proofIds");

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (String(job.technicianId?._id) !== String(tech._id)) {
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