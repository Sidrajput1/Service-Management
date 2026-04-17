import { requireCurrentUser, requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Booking from "@/models/booking";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Lead from "@/models/lead";
import { NextResponse } from "next/server";
import '@/models/technician';


export const runtime = "nodejs";

export async function GET(){
    try {
      await requireRole(['customer']);
        await connectToDb();
        const customer = await requireCurrentUser();
      //const {cutomer} = await requireRole({customer});
        //console.log(customer);

        const requests = await Lead.find({customerId:customer.id})
                        .sort({createdAt:-1})
                        .limit(8)
                        .lean();

        const bookings = await Booking.find({customerId:customer.id})
                        .sort({createdAt:-1})
                        .limit(8)
                        .lean();
        
        const bookingsId = bookings.map((b:any) => b._id);

        const jobs = await Job.find({bookingId:{$in:bookingsId}})
            .populate("bookingId")
      .populate("technicianId")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

       const invoices = await Invoice.find({ customerId: customer.id })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const activeJobs = jobs.filter((job: any) =>
      ["assigned", "accepted", "enroute", "arrived", "otp_verified", "in_progress", "on_hold"].includes(job.status)
    );

    const completedJobs = jobs.filter((job: any) => job.status === "completed");

    const pendingInvoices = invoices.filter((inv: any) => inv.balanceDue > 0);

    return NextResponse.json({
      summary: {
        totalRequests: requests.length,
        activeJobs: activeJobs.length,
        completedJobs: completedJobs.length,
        pendingInvoices: pendingInvoices.length,
      },
      customer,
      requests,
      jobs,
      invoices,
    })
    } catch (error:any) {
        return NextResponse.json(
            {error:error.message || "Server error"},
            {status:error.status || 500}
        )
    }
}