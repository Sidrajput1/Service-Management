import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import {Customer,ServiceOffering,Technician,Booking} from "@/models/index";
import Job from "@/models/job";
import Invoice from "@/models/invoice";
import JobProof from "@/models/jobProof";
//import Customer from "@/models/customer";

//import ServiceOffering from "@/models/ServiceOffering";


export const runtime = "nodejs";

function buildJobTimeline(
  job: any,
  booking: any,
) {
  const status = job.status;

  return [
    {
      key: "assigned",
      title: "Technician assigned",
      description:
        "A technician has been assigned to this job.",
      completed: [
        "assigned",
        "enroute",
        "arrived",
        "otp_verified",
        "in_progress",
        "on_hold",
        "completed",
      ].includes(status),
      current: status === "assigned",
      timestamp: job.createdAt,
    },

    {
      key: "enroute",
      title: "Technician on the way",
      description:
        "The technician has started travelling to the customer.",
      completed: [
        "enroute",
        "arrived",
        "otp_verified",
        "in_progress",
        "on_hold",
        "completed",
      ].includes(status),
      current: status === "enroute",
      timestamp: job.acceptedAt,
    },

    {
      key: "arrived",
      title: "Technician arrived",
      description:
        "The technician reached the service location.",
      completed: [
        "arrived",
        "otp_verified",
        "in_progress",
        "on_hold",
        "completed",
      ].includes(status),
      current: status === "arrived",
      timestamp: job.arrivedAt,
    },

    {
      key: "otp_verified",
      title: "Customer verified",
      description:
        "Customer verification OTP was successfully verified.",
      completed: [
        "otp_verified",
        "in_progress",
        "on_hold",
        "completed",
      ].includes(status),
      current: status === "otp_verified",
      timestamp: job.customerOtpVerifiedAt,
    },

    {
      key: "in_progress",
      title: "Service in progress",
      description:
        "The technician is currently performing the service.",
      completed: [
        "in_progress",
        "on_hold",
        "completed",
      ].includes(status),
      current: [
        "in_progress",
        "on_hold",
      ].includes(status),
      timestamp: job.startTime,
    },

    {
      key: "completed",
      title: "Service completed",
      description:
        "The technician completed the assigned job.",
      completed: status === "completed",
      current: status === "completed",
      timestamp: job.endTime,
    },
  ];
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    await connectToDb();

    const { provider } =
      await requireServiceProvider(
        session.user.id,
      );

    const { id } = await params;

    /*
     * IMPORTANT:
     * The job must belong to the logged-in provider.
     */
    const job = await Job.findOne({
      _id: id,
      serviceProviderId: provider._id,
    })
      .populate(
        "technicianId",
        "status isActive skills vehicleType currentLocation lastCompletedWorkLocation userId",
      )
      .populate({
        path: "technicianId",
        populate: {
          path: "userId",
          select: "name email phone",
        },
      })
      .lean();

    if (!job) {
      return NextResponse.json(
        {
          error: "Assigned job not found",
        },
        {
          status: 404,
        },
      );
    }

    const booking = await Booking.findOne({
      _id: job.bookingId,
      serviceProviderId: provider._id,
    })
      .populate(
        "customerId",
        "name phone email addresses notes",
      )
      .populate(
        "serviceOfferingId",
        "name price taxPercent description offerEnabled offerName discountType discountValue",
      )
      .lean();

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking associated with this job was not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Invoice may not exist until the job is completed.
     */
    let invoice = null;

    if (job.invoiceId) {
      invoice =
        await Invoice.findById(
          job.invoiceId,
        )
          .select(
            "invoiceNumber status currency items subtotal discountAmount taxPercent taxAmount grandTotal amountPaid balanceDue razorpayOrderId razorpayPaymentId paymentMethod paymentReceivedAt issuedAt dueDate",
          )
          .lean();
    }

    /*
     * Load proof uploaded for this job.
     */
    const proofs = await JobProof.find({
      _id: {
        $in: job.proofIds || [],
      },
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    const timeline = buildJobTimeline(
      job,
      booking,
    );

    return NextResponse.json({
      success: true,

      job,

      booking,

      customer:
        booking.customerId,

      service:
        booking.serviceOfferingId,

      technician:
        job.technicianId,

      invoice,

      proofs,

      timeline,
    });
  } catch (error: any) {
    console.error(
      "Provider assigned job detail error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load assigned job",
      },
      {
        status: 500,
      },
    );
  }
}