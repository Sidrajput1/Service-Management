import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Booking from "@/models/booking";
import { notifyJobStatus, notifyTechnicianArrived } from "@/lib/notify-events";
import '@/models/customer'
import { getJobNotificationRecipients } from "@/lib/notification-recipents";

export async function POST(_: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {

    const {id} = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await tech.populate("userId", "name");

    if (String(job.technicianId) !== String(tech._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status !== "enroute") {
      return NextResponse.json({ error: "You must accept the job first" }, { status: 400 });
    }


    job.status = "arrived";
    job.arrivedAt = new Date();
    await job.save();

    const booking = await Booking.findById(job.bookingId)
                    .populate("customerId");
    
    const customer = booking?.customerId as any;

    // await notifyJobStatus({
    //   customerUserId : customer?.userId ? String(customer.userId) : undefined,
    //   jobId:job._id.toString(),
    //   bookingId:String(job.bookingId),
    //   title:"Technician reached your location",
    //   message:"The technician has reached your address"
    // });

    //-----------------------------------------------------------------------
    // notify customer - technician arrived
    //-----------------------------------------------------------------------

    const recipients =
  await getJobNotificationRecipients(
    job._id.toString(),
  );

await notifyTechnicianArrived({
  customerUserId:
    recipients.customerUserId!,

  jobId:
    job._id.toString(),

  bookingId:
    job.bookingId.toString(),

  technicianName:
    tech.userId?.name || "Technician" // here the error says cannot find technician, how can i get solve this , and get technician user name
});

//-------------------------------------------

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}