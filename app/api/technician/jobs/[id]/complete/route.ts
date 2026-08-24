import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Booking from "@/models/booking";
import { notifyInvoiceIssued, notifyJobStatus, notifyServiceCompleted } from "@/lib/notify-events";
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
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } =
      await params;

    await requireRole([
      "technician",
    ]);

    const { tech } =
      await requireTechnicianProfile();

    await connectToDb();

    const job =
      await Job.findById(id);

    if (!job) {
      return NextResponse.json(
        {
          error: "Job not found",
        },
        {
          status: 404,
        },
      );
    }

    if (
      String(job.technicianId) !==
      String(tech._id)
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * IMPORTANT:
     *
     * Allow retry if the job is already completed
     * but invoice generation failed previously.
     */
    if (
      job.status !==
        "in_progress" &&
      job.status !==
        "on_hold" &&
      job.status !==
        "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "Job must be in progress before completion",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Proof is required only when we are
     * transitioning into completed.
     */
    if (
      job.status !==
        "completed" &&
      job.proofRequired &&
      (!job.proofIds ||
        job.proofIds.length === 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Proof is required before completing the job",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Complete job if it is not already completed.
     */
    if (
      job.status !==
      "completed"
    ) {
      job.status =
        "completed";

      job.endTime =
        new Date();

      await job.save();
    }

    /*
     * Load booking.
     */
    const booking =
      await Booking.findById(
        job.bookingId,
      ).populate({
        path: "customerId",
        populate: {
          path: "userId",
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Generate invoice.
     *
     * The helper is idempotent:
     * if invoice already exists,
     * it returns the same invoice.
     */
    let invoice;

    try {
      invoice =
        await generateInvoiceForJob(
          job._id,
        );
    } catch (invoiceError: any) {
      console.error(
        "Invoice generation failed:",
        invoiceError,
      );

      /*
       * IMPORTANT:
       *
       * Job is completed, but invoice wasn't
       * generated. Return a clear error so it
       * can be retried without re-running the
       * service itself.
       */
      return NextResponse.json(
        {
          error:
            invoiceError.message ||
            "Job completed but invoice generation failed",
        },
        {
          status: 500,
        },
      );
    };

    //-------------------------
    // Notify customer , provider , technician for completion of job

    const recipients =
  await getJobNotificationRecipients(
    job._id.toString(),
  );

  await notifyServiceCompleted({
  customerUserId:
    recipients.customerUserId ||
    undefined,

  providerUserId:
    recipients.providerUserId ||
    undefined,

  technicianUserId:
    recipients.technicianUserId ||
    undefined,

  jobId:
    job._id.toString(),

  bookingId:
    job.bookingId.toString(),

  serviceName:
    booking.serviceType,
});

await notifyInvoiceIssued({
  customerUserId:
    recipients.customerUserId ||
    undefined,

  providerUserId:
    recipients.providerUserId ||
    undefined,

  invoiceId:
    invoice._id.toString(),

  bookingId:
    booking._id.toString(),

  invoiceNumber:
    invoice.invoiceNumber,

  amount:
    invoice.balanceDue,
});

    /*
     * Notify customer that the service is
     * completed and invoice is available.
     */
    // const customer: any =
    //   booking.customerId;

    // const customerUserId =
    //   customer?.userId?._id
    //     ? String(
    //         customer.userId._id,
    //       )
    //     : null;

    // if (customerUserId) {
    //   await notifyJobStatus({
    //     customerUserId,

    //     jobId:
    //       job._id.toString(),

    //     bookingId:
    //       String(job.bookingId),

    //     title:
    //       "Service completed",

    //     message:
    //       `Your service is completed. Invoice ${invoice.invoiceNumber} is ready for payment.`,
    //   });
    // }

    /*
     * Check if technician has other active jobs.
     */
    const otherActiveJobs =
      await Job.countDocuments({
        technicianId:
          tech._id,

        _id: {
          $ne: job._id,
        },

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
      });

    if (
      otherActiveJobs === 0
    ) {
      tech.status =
        "available";
    }

    tech.jobsCompleted =
      (tech.jobsCompleted || 0) +
      1;

    /*
     * Save last completed location.
     */
    tech.lastCompletedWorkLocation =
      {
        type: "Point",

        coordinates:
          tech.currentLocation
            ?.coordinates ||
          [0, 0],

        updatedAt:
          new Date(),

        addressText:
          booking.address
            ?.addressLine ||
          "",

        jobId:
          job._id,
      };

    await tech.save();

    return NextResponse.json({
      success: true,

      job: {
        id: job._id,

        status:
          job.status,

        invoiceId:
          invoice._id,
      },

      invoice: {
        id:
          invoice._id,

        invoiceNumber:
          invoice.invoiceNumber,

        status:
          invoice.status,

        grandTotal:
          invoice.grandTotal,

        amountPaid:
          invoice.amountPaid,

        balanceDue:
          invoice.balanceDue,
      },
    });
  } catch (err: any) {
    console.error(
      "Complete job error:",
      err,
    );

    return NextResponse.json(
      {
        error:
          err.message ||
          "Server error",
      },
      {
        status:
          err.status || 500,
      },
    );
  }
}
