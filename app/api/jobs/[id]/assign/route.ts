// app/api/jobs/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { string, z } from "zod";

import { requireRole, requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Technician from "@/models/technician";
import Booking from "@/models/booking";
import Job from "@/models/job";
import { ensureJobConversation } from "@/lib/chat/ensure-job-conversation";
import { User } from "lucide-react";
import { notifyJobAssigned } from "@/lib/notify-events";
import "@/models/customer";
import "@/models/user";
import {
  createNotification,
  createNotificationForRole,
} from "@/lib/notification";

const AssignSchema = z.object({
  technicianId: z.string().min(1, "technicianId is required"),
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }>},
) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const {id} = await params;
    const body = await request.json();
    const parsed = AssignSchema.parse(body);
    const currentUser = await requireCurrentUser();

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "cancelled") {
      return NextResponse.json(
        { error: "Completed or cancelled jobs cannot be reassigned" },
        { status: 400 },
      );
    }

    const tech = await Technician.findById(parsed.technicianId);
    if (!tech) {
      return NextResponse.json(
        { error: "Technician not found" },
        { status: 404 },
      );
    }

    job.technicianId = tech._id;
    job.assignedBy = currentUser._id;
    job.status = "assigned";
    job.otp = generateOtp();
    job.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await job.save();

    // doing populate using customer models
    const booking = await Booking.findById(job.bookingId).populate({
      path: "customerId",
      populate: { path: "userId" },
    });

    const customer = booking?.customerId as any;
    const customerUserId = customer?.userId?._id
      ? String(customer.userId._id)
      : null;

    
    if (booking) {
      booking.status = "assigned";
      await booking.save();
    };

    try {
  await createNotification({
    recipientUserId: tech.userId.toString(),
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

    await ensureJobConversation(String(job._id), {
      _id: currentUser._id,
      role: currentUser.role,
    });

    tech.status = "busy";
    await tech.save();

    // now technician gets job assigned notifications and customer gets technician assigned notifications.

    return NextResponse.json({ job });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 },
    );
  }
}
