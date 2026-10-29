import { NextResponse } from "next/server";

import { requireRole, ApiAuthError } from "@/lib/auth";
import { apiFailure } from "@/lib/api-response";
import { withAssignedJob } from "@/lib/assigned-job-transaction";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Booking from "@/models/booking";
import Technician from "@/models/technician";
import {
  notifyInvoiceIssued,
  notifyServiceCompleted,
} from "@/lib/notify-events";
import "@/models/customer";
import "@/models/user";
import { generateInvoiceForJob } from "@/lib/billing/generateInvoiceForJob";
import { getJobNotificationRecipients } from "@/lib/notification-recipents";

// export async function POST(
//   _: Request,
//   { params }: { params: Promise<{ id: string }> },
// ) {
//   try {
//     const { id } = await params;
//     await requireRole(["technician"]);
//     const { tech } = await requireTechnicianProfile();
//     await connectToDb();

//     const job = await Job.findById(id);
//     if (!job) {
//       return NextResponse.json({ error: "Job not found" }, { status: 404 });
//     }

//     if (String(job.technicianId) !== String(tech._id)) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     if (job.status !== "in_progress" && job.status !== "on_hold") {
//       return NextResponse.json(
//         { error: "Job must be in progress before completion" },
//         { status: 400 },
//       );
//     }

//     if (job.proofRequired && (!job.proofIds || job.proofIds.length === 0)) {
//       return NextResponse.json(
//         { error: "Proof is required before completing the job" },
//         { status: 400 },
//       );
//     }

//     job.status = "completed";

//     const booking = await Booking.findById(job.bookingId).populate({
//       path: "customerId",
//       populate: { path: "userId" },
//     });

//     const customer: any = booking?.customerId;
//     const customerUserId = customer?.userId?._id
//       ? String(customer.userId._id)
//       : null;

//     if (customerUserId) {
//       await notifyJobStatus({
//         customerUserId,
//         jobId: job._id.toString(),
//         bookingId: String(job.bookingId),
//         title: "Service completed",
//         message: "Your service work has been completed",
//       });
//     }
//     job.endTime = new Date();
//     await job.save();

//     const invoice = await generateInvoiceForJob(job._id);

//     const otherActiveJobs = await Job.countDocuments({
//       technicianId: tech._id,
//       _id: { $ne: job._id },
//       status: {
//         $in: [
//           "assigned",
//           "accepted",
//           "enroute",
//           "arrived",
//           "otp_verified",
//           "in_progress",
//           "on_hold",
//         ],
//       },
//     });

//     if (otherActiveJobs === 0) {
//       tech.status = "available";
//     }

//     tech.jobsCompleted = (tech.jobsCompleted || 0) + 1;
//     await tech.save();
//     //const tech = await Technician.findById(job.technicianId);
//     if (tech) {
//       tech.lastCompletedWorkLocation = {
//         type: "Point",
//         coordinates: tech.currentLocation?.coordinates || [0, 0],
//         updatedAt: new Date(),
//         addressText: booking?.address?.addressLine || "",
//         jobId: job._id,
//       };
//       await tech.save();
//     }

//     // return NextResponse.json({ job });
//     return NextResponse.json({
//       success: true,

//       job: {
//         id: job._id,
//         status: job.status,
//       },

//       invoice: {
//         id: invoice._id,
//         invoiceNumber: invoice.invoiceNumber,
//         status: invoice.status,
//         grandTotal: invoice.grandTotal,
//         amountPaid: invoice.amountPaid,
//         balanceDue: invoice.balanceDue,
//       },
//     });
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Server error" },
//       { status: err.status || 500 },
//     );
//   }
// }

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();
    const completion = await withAssignedJob(
      id,
      String(tech._id),
      async ({ job: assigned, session }) => {
        if (!["in_progress", "on_hold", "completed"].includes(assigned.status))
          throw new ApiAuthError(
            "Job must be in progress before completion",
            400,
          );
        if (
          assigned.status !== "completed" &&
          assigned.proofRequired &&
          !assigned.proofIds?.length
        )
          throw new ApiAuthError(
            "Proof is required before completing the job",
            400,
          );
        const transitioned = assigned.status !== "completed";
        if (transitioned) {
          assigned.status = "completed";
          assigned.endTime = new Date();
          await assigned.save({ session });
          const otherActiveJobs = await Job.countDocuments({
            technicianId: tech._id,
            _id: { $ne: assigned._id },
            status: {
              $in: [
                "assigned",
                "enroute",
                "arrived",
                "otp_verified",
                "in_progress",
                "on_hold",
              ],
            },
          }).session(session);
          const counted = await Technician.updateOne(
            { _id: tech._id, isActive: { $ne: false } },
            {
              $inc: { jobsCompleted: 1 },
              ...(otherActiveJobs === 0
                ? { $set: { status: "available" } }
                : {}),
            },
            { session },
          );
          if (counted.matchedCount !== 1)
            throw new ApiAuthError(
              "Active Pro profile changed. Refresh before continuing.",
              409,
            );
        }
        return { job: assigned, transitioned };
      },
    );
    const { job } = completion;
    const booking = await Booking.findById(job.bookingId).populate({
      path: "customerId",
      populate: { path: "userId" },
    });
    if (!booking)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const recipients = await getJobNotificationRecipients(String(job._id));
    // Existing recipient-scoped notification dedupe makes partial delivery safely retryable.
    await notifyServiceCompleted({
      customerUserId: recipients.customerUserId || undefined,
      providerUserId: recipients.providerUserId || undefined,
      technicianUserId: recipients.technicianUserId || undefined,
      jobId: String(job._id),
      bookingId: String(job.bookingId),
      serviceName: booking.serviceType,
    });
    // Legacy global Pro coordinates have no trusted job provenance. Preserve the
    // existing last-work location; Job.endTime records completion without inventing GPS.
    // A completed replay may repair a failed invoice operation without completing work again.
    let invoice;
    try {
      invoice = await generateInvoiceForJob(job._id);
    } catch {
      console.error("Invoice generation failed after job completion.");
      return NextResponse.json(
        {
          error:
            "The service is complete, but its invoice could not be generated. Retry invoice generation.",
        },
        { status: 500 },
      );
    }
    await notifyInvoiceIssued({
      customerUserId: recipients.customerUserId || undefined,
      providerUserId: recipients.providerUserId || undefined,
      invoiceId: String(invoice._id),
      bookingId: String(booking._id),
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.balanceDue,
    });
    return NextResponse.json({
      success: true,
      job: { id: job._id, status: job.status, invoiceId: invoice._id },
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        grandTotal: invoice.grandTotal,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
