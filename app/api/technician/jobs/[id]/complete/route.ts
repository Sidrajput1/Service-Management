import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Booking from "@/models/booking";
import { notifyJobStatus } from "@/lib/notify-events";
import '@/models/customer';
import '@/models/user';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {

    const {id} = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const job = await Job.findById(id);
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

//     const booking = await Booking.findById(job.bookingId).populate("customerId");
//     const customer = booking?.customerId as any;

//     await notifyJobStatus({
//   customerUserId: customer?.userId ? String(customer.userId) : undefined,
//   jobId: job._id.toString(),
//   bookingId: String(job.bookingId),
//   title: "Service completed",
//   message: "Your service work has been completed",
// });

const booking = await Booking.findById(job.bookingId).populate({
  path: "customerId",
  populate: { path: "userId" },
});

const customer: any = booking?.customerId;
const customerUserId = customer?.userId?._id ? String(customer.userId._id) : null;

if (customerUserId) {
  await notifyJobStatus({
    customerUserId,
    jobId: job._id.toString(),
    bookingId: String(job.bookingId),
    title: "Service completed",
    message: "Your service work has been completed",
  });
}
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
    //const tech = await Technician.findById(job.technicianId);
if (tech) {
  tech.lastCompletedWorkLocation = {
    type: "Point",
    coordinates: tech.currentLocation?.coordinates || [0, 0],
    updatedAt: new Date(),
    addressText: booking?.address?.addressLine || "",
    jobId: job._id,
  };
  await tech.save();
}

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}