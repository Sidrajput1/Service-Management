import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Booking from "@/models/booking";
import { notifyJobStatus, notifyTechnicianAcceptedJob, notifyTechnicianEnroute } from "@/lib/notify-events";
import { getJobNotificationRecipients } from "@/lib/notification-recipents";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> } ) {
  try {

    const { id } = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

   // console.log(`Technician ${tech._id} is attempting to accept job ${id}`);
    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    // populate technician for getting his name through userId

    await tech.populate("userId","name");

    if (String(job.technicianId) !== String(tech._id)) {
      return NextResponse.json({ error: "This job is not assigned to you" }, { status: 403 });
    }

    if (!["assigned", "scheduled"].includes(job.status)) {
      return NextResponse.json({ error: "Job cannot be accepted in current status" }, { status: 400 });
    }

    job.status = "enroute";
    job.acceptedAt = new Date();
    await job.save();

    tech.status = "busy";
    await tech.save();

     const booking = await Booking.findById(job.bookingId).populate("customerId");
     const customer = booking?.customerId as any;

  //   await notifyJobStatus({
  //     customerUserId:customer?.userId ? String(customer.userId) : undefined,
  //     jobId: job._id.toString(),
  // bookingId: String(job.bookingId),
  // title: "Technician accepted your job",
  // message: "A technician has accepted your service request",
  //   })

  //------------------------------------------------
  // send notification 
  //--------------------------------------------------
  
  const recipients =
  await getJobNotificationRecipients(
    job._id.toString(),
  );

  await notifyTechnicianAcceptedJob({
  customerUserId:
    recipients.customerUserId ||
    undefined,

  providerUserId:
    recipients.providerUserId ||
    undefined,

  jobId:
    job._id.toString(),

  bookingId:
    job.bookingId.toString(),

  // serviceName:
  //   booking.serviceType,

  // technicianName:
  //     tech.name,
});



await notifyTechnicianEnroute({
  customerUserId:
    recipients.customerUserId!,

  jobId:
    job._id.toString(),

  bookingId:
    job.bookingId.toString(),

  technicianName:
    tech.userId?.name ?? "Technician",
});
    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}