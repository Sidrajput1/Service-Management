// app/api/jobs/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole, requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Technician from "@/models/technician";
import Booking from "@/models/booking";
import Job from "@/models/job";


const AssignSchema = z.object({
  technicianId: z.string().min(1, "technicianId is required"),
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await request.json();
    const parsed = AssignSchema.parse(body);
    const currentUser = await requireCurrentUser();

    const job = await Job.findById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "cancelled") {
      return NextResponse.json(
        { error: "Completed or cancelled jobs cannot be reassigned" },
        { status: 400 }
      );
    }

    const tech = await Technician.findById(parsed.technicianId);
    if (!tech) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    job.technicianId = tech._id;
    job.assignedBy = currentUser._id;
    job.status = "assigned";
    job.otp = generateOtp();
    job.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await job.save();

    const booking = await Booking.findById(job.bookingId);
    if (booking) {
      booking.status = "assigned";
      await booking.save();
    }

    tech.status = "busy";
    await tech.save();

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