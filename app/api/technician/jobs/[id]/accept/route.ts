import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> } ) {
  try {

    const { id } = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    console.log(`Technician ${tech._id} is attempting to accept job ${id}`);
    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (String(job.technicianId) !== String(tech._id)) {
      return NextResponse.json({ error: "This job is not assigned to you" }, { status: 403 });
    }

    if (!["assigned", "scheduled"].includes(job.status)) {
      return NextResponse.json({ error: "Job cannot be accepted in current status" }, { status: 400 });
    }

    job.status = "enroute";
    job.acceptedAt = new Date();
    await job.save();

    tech.status = "busy";
    await tech.save();

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}