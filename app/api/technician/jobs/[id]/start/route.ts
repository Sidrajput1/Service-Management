import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";

const StartSchema = z.object({
  otp: z.string().min(4, "OTP is required"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const {id} = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const body = await request.json();
    const parsed = StartSchema.parse(body);

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (String(job.technicianId) !== String(tech._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status !== "arrived") {
      return NextResponse.json({ error: "You must reach the customer first" }, { status: 400 });
    }

    if (!job.otp || job.otp !== parsed.otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // if (job.otpExpiresAt && job.otpExpiresAt < new Date()) {
    //   return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    // }

    job.status = "in_progress";
    job.customerOtpVerifiedAt = new Date();
    job.startTime = new Date();
    await job.save();

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