// app/api/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { apiFailure } from "@/lib/api-response";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import { cancelBooking, notifyCancellation } from "@/lib/booking-cancellation";
import { requestIdSchema } from "@/lib/finance-validation";
import { assertFinanceWrite } from "@/lib/finance-security";


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
  cancellationReason: z.string().optional(),
  cancellationNote: z.string().trim().max(1000).optional(),
  requestId: requestIdSchema.optional(),
  scheduledAt: z.string().optional().nullable(),
});

export async function GET(_: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const {id} = await params;
    const job = await Job.findById(id)
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

export async function PUT(request: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    const {user} = await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const {id} = await params;
    const body = await request.json();
    const parsed = JobUpdateSchema.parse(body);
    if (parsed.status) {
      const current = await Job.findById(id);
      if (!current) return NextResponse.json({error:"Job not found"},{status:404});
      if (parsed.status === "cancelled") {
        assertFinanceWrite(request);
        const cancellation = z.object({reason:z.string().min(1),requestId:requestIdSchema}).parse({reason:parsed.cancellationReason,requestId:parsed.requestId});
        const result = await cancelBooking(user,String(current.bookingId),{...cancellation,note:parsed.cancellationNote});
        await notifyCancellation(String(current.bookingId),cancellation.requestId);
        return NextResponse.json(result);
      }
      if (parsed.status !== current.status) return NextResponse.json({error:"Use the authorized job workflow to change status. OTP, proof and completion checks are required."},{status:409});
    }

    const job = await Job.findByIdAndUpdate(
      id,
      {
        ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
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

export async function DELETE() {
  try { await requireRole(["admin"]); return NextResponse.json({error:"Job history is retained. Cancel the booking with a reason instead."},{status:409}); }
  catch (error) { return apiFailure(error); }
}
