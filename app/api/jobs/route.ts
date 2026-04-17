// app/api/jobs/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole, requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Booking from "@/models/booking";
import Technician from "@/models/technician";
import '@/models/customer';
import { createNotification, createNotificationForRole } from "@/lib/notification";



const JobCreateSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  technicianId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  proofRequired: z.boolean().optional(),
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await request.json();
    const parsed = JobCreateSchema.parse(body);
    const currentUser = await requireCurrentUser();

    //const booking = await Booking.findById(parsed.bookingId);
    const booking = await Booking.findById(parsed.bookingId).populate({
          path: "customerId",
          populate: { path: "userId" },
        });
    
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const existingJob = await Job.findOne({ bookingId: parsed.bookingId });
    if (existingJob) {
      return NextResponse.json(
        { error: "A job already exists for this booking" },
        { status: 400 }
      );
    }

    let technicianDoc = null;
    if (parsed.technicianId) {
      technicianDoc = await Technician.findById(parsed.technicianId);
      if (!technicianDoc) {
        return NextResponse.json({ error: "Technician not found" }, { status: 404 });
      }
    };

    const tech = await Technician.findById(parsed.technicianId);

    const otp = parsed.technicianId ? generateOtp() : undefined;
    const otpExpiresAt = otp ? new Date(Date.now() + 10 * 60 * 1000) : undefined;

    const job = await Job.create({
      bookingId: booking._id,
      technicianId: parsed.technicianId || undefined,
      assignedBy: currentUser._id,
      scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : booking.scheduledAt,
      status: parsed.technicianId ? "assigned" : "scheduled",
      otp,
      otpExpiresAt,
      proofRequired: parsed.proofRequired ?? true,
      notes: parsed.notes || undefined,
    });

    const customer = booking?.customerId as any;
    const customerUserId = customer?.userId?._id
      ? String(customer.userId._id)
      : null;

    booking.status = parsed.technicianId ? "assigned" : "confirmed";
    await booking.save();

    try {
      await createNotification({
        recipientUserId: tech?.userId.toString(),
        title: "Job assigned",
        message: `You have been assigned a job for ${booking?.serviceType || "service"}`,
        type: "job",
        entityType: "job",
        entityId: job._id.toString(),
        actionUrl: `/technician/jobs/${job._id}`,
      });
    
      if (customerUserId) {
        await createNotification({
          recipientUserId: customerUserId,
          title: "Technician assigned",
          message: `A technician has been assigned to your booking`,
          type: "job",
          entityType: "booking",
          entityId: String(job.bookingId),
          actionUrl: `/customer/bookings/${job.bookingId}`,
        });
      }
    
      await createNotificationForRole("admin", {
        title: "Job assigned",
        message: `Technician assigned for booking ${String(job.bookingId)}`,
        type: "job",
        entityType: "job",
        entityId: job._id.toString(),
        actionUrl: "/admin/jobs",
      });
    
    } catch (err) {
      console.error("Notification error:", err);
    }
    

    if (technicianDoc && parsed.technicianId) {
      technicianDoc.status = "busy";
      await technicianDoc.save();
    }

    return NextResponse.json({ job }, { status: 201 });
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