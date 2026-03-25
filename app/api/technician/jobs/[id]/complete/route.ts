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

    if (job.status !== "in_progress" && job.status !== "on_hold") {
      return NextResponse.json({ error: "Job must be in progress before completion" }, { status: 400 });
    }

    if (job.proofRequired && (!job.proofIds || job.proofIds.length === 0)) {
      return NextResponse.json({ error: "Proof is required before completing the job" }, { status: 400 });
    }

    job.status = "completed";
    job.endTime = new Date();
    await job.save();

    const otherActiveJobs = await Job.countDocuments({
      technicianId: tech._id,
      _id: { $ne: job._id },
      status: { $in: ["assigned", "accepted", "enroute", "arrived", "otp_verified", "in_progress", "on_hold"] },
    });

    if (otherActiveJobs === 0) {
      tech.status = "available";
    }

    tech.jobsCompleted = (tech.jobsCompleted || 0) + 1;
    await tech.save();

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}