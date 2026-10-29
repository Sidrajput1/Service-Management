// app/api/jobs/route.ts
import { NextResponse } from "next/server";
import { apiFailure, privateJson } from "@/lib/api-response";
import { assertFinanceWrite } from "@/lib/finance-security";
import { staffAssignJob } from "@/lib/staff-job-assignment";
import { objectIdSchema } from "@/lib/pagination";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import '@/models/customer';
const JobCreateSchema = z.object({
  bookingId: objectIdSchema,
  technicianId: objectIdSchema.optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  proofRequired: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Number(url.searchParams.get("limit") || "20"));

    const total = await Job.countDocuments();
    const jobs = await Job.find()
      .populate("bookingId")
      .populate("technicianId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ jobs, total, page, limit });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try { const {user}=await requireRole(["admin","dispatcher"]); assertFinanceWrite(request); const parsed=JobCreateSchema.parse(await request.json()); return privateJson(await staffAssignJob(user,{bookingId:parsed.bookingId,technicianId:parsed.technicianId||undefined,scheduledAt:parsed.scheduledAt||undefined,notes:parsed.notes,proofRequired:parsed.proofRequired}),201); }
  catch(error){return apiFailure(error);}
}
