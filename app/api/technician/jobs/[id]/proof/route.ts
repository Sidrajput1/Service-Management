import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import JobProof from "@/models/jobProof";

const ProofSchema = z.object({
  proofNote: z.string().optional().nullable(),
  proofs: z.array(
    z.object({
      url: z.string().min(1),
      type: z.enum(["photo", "before_photo", "after_photo", "signature", "video", "other"]).optional(),
      thumbnailUrl: z.string().optional().nullable(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
  ).min(1, "At least one proof is required"),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const body = await request.json();
    const parsed = ProofSchema.parse(body);

    const job = await Job.findById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (String(job.technicianId) !== String(tech._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["in_progress", "on_hold", "arrived", "accepted"].includes(job.status)) {
      return NextResponse.json({ error: "Cannot upload proof in current status" }, { status: 400 });
    }

    const proofDocs = await JobProof.insertMany(
      parsed.proofs.map((proof) => ({
        jobId: job._id,
        uploadedBy: tech.userId,
        type: proof.type || "photo",
        url: proof.url,
        thumbnailUrl: proof.thumbnailUrl || undefined,
        metadata: {
          ...proof.metadata,
          note: parsed.proofNote || undefined,
        },
      }))
    );

    job.proofIds = [...(job.proofIds || []), ...proofDocs.map((p) => p._id)];
    job.proofSubmittedAt = new Date();
    await job.save();

    return NextResponse.json({ proofs: proofDocs, job });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}