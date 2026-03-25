import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const job = await Job.findById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (String(job.technicianId) !== String(tech._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // if (job.status !== "accepted") {
    //   return NextResponse.json({ error: "You must accept the job first" }, { status: 400 });
    // }


    job.status = "arrived";
    job.arrived = new Date();
    await job.save();

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}