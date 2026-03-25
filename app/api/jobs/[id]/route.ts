// app/api/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";


const JobUpdateSchema = z.object({
  status: z
    .enum([
      "scheduled",
      "assigned",
      "enroute",
      "arrived",
      "otp_verified",
      "in_progress",
      "on_hold",
      "completed",
      "cancelled",
    ])
    .optional(),
  notes: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const job = await Job.findById(params.id)
      .populate("bookingId")
      .populate("technicianId")
      .lean();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await request.json();
    const parsed = JobUpdateSchema.parse(body);

    const job = await Job.findByIdAndUpdate(
      params.id,
      {
        ...parsed,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
      },
      { new: true }
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin"]);
    await connectToDb();

    const deleted = await Job.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}