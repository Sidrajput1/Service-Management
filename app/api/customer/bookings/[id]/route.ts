import { NextResponse } from "next/server";

import { requireCustomer, requireCustomerProfile } from "@/lib/customer";

import { connectToDb } from "@/lib/db";
import { buildCustomerTimeline } from "@/lib/customer-timeline";
//import Booking from "@/models/booking";
import Job from "@/models/job";
import Invoice from "@/models/invoice";
import Payment from "@/models/payment";
import Lead from "@/models/lead";
import { ServiceOffering, Customer, Booking } from "@/models/index";
import ServiceProvider from "@/models/ServiceProvider";
import "@/models/jobProof";
import "@/models/technician";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

// export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
//   try {
//     await connectToDb();
//     const { customer } = await requireCustomerProfile();

//     const {id} = await params;
//     const booking = await Booking.findById(id)
//       .populate("customerId")
//       .populate("leadId")
//       .lean();

//     if (!booking) {
//       return NextResponse.json({ error: "Booking not found" }, { status: 404 });
//     }

//     if (String((booking as any).customerId?._id || (booking as any).customerId) !== String(customer._id)) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     const job = await Job.findOne({ bookingId: booking._id })
//       .populate({
//         path: "technicianId",
//         populate: { path: "userId" },
//       })
//       .populate("proofIds")
//       .lean();

//     const invoice = await Invoice.findOne({ bookingId: booking._id }).lean();

//     const payment = invoice
//       ? await Payment.findOne({
//           invoiceId: invoice._id,
//           status: "success",
//         })
//           .sort({ createdAt: -1 })
//           .lean()
//       : null;

//     const lead = booking.leadId
//       ? (await Lead.findById((booking as any).leadId))?._id
//       : null;

//     const timeline = buildCustomerTimeline({
//       lead: booking.leadId || lead,
//       booking,
//       job,
//       invoice,
//       payment,
//     });

//     return NextResponse.json({
//       booking,
//       job,
//       invoice,
//       payment,
//       timeline,
//     });
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Server error" },
//       { status: err.status || 500 }
//     );
//   }
// }

// implement new get request for getting bookings id info .

function getCustomerTracking(job: any, booking: any) {
  if (booking.status === "cancelled") {
    return {
      key: "cancelled",
      label: "Booking cancelled",
      description: "This service booking has been cancelled.",
      progress: 0,
    };
  }

  if (!job) {
    if (booking.status === "confirmed") {
      return {
        key: "provider_accepted",
        label: "Provider accepted",
        description:
          "The service provider has accepted your request. A technician will be assigned soon.",
        progress: 2,
      };
    }

    if (booking.status === "assigned") {
      return {
        key: "technician_assigned",
        label: "Technician assigned",
        description: "A technician has been assigned to your service.",
        progress: 3,
      };
    }

    return {
      key: "request_sent",
      label: "Request sent",
      description: "Your service request is being processed.",
      progress: 1,
    };
  }

  switch (job.status) {
    case "scheduled":
      return {
        key: "technician_assigned",
        label: "Technician assigned",
        description: "Your technician has been scheduled for this service.",
        progress: 3,
      };

    case "assigned":
      return {
        key: "technician_assigned",
        label: "Technician assigned",
        description:
          "Your technician has been assigned and will handle your service.",
        progress: 3,
      };

    case "enroute":
      return {
        key: "technician_enroute",
        label: "Technician is on the way",
        description: "Your technician is travelling to the service address.",
        progress: 4,
      };
    case "arrived":
      return {
        key: "technician_arrived",
        label: "Technician arrived",
        description: "Your technician has arrived at the service location.",
        progress: 5,
      };

    case "otp_verified":
      return {
        key: "service_verified",
        label: "Service verified",
        description: "The service has been verified and is ready to begin.",
        progress: 6,
      };

    case "in_progress":
      return {
        key: "service_in_progress",
        label: "Service in progress",
        description: "Your technician is currently working on the service.",
        progress: 7,
      };

    case "on_hold":
      return {
        key: "service_on_hold",
        label: "Service temporarily paused",
        description: "The service is currently on hold.",
        progress: 7,
      };

    case "completed":
      return {
        key: "completed",
        label: "Service completed",
        description: "Your service has been completed successfully.",
        progress: 8,
      };

    case "cancelled":
      return {
        key: "cancelled",
        label: "Job cancelled",
        description: "The service job has been cancelled.",
        progress: 0,
      };
    default:
      return {
        key: "request_sent",
        label: "Request sent",
        description: "Your service request is being processed.",
        progress: 1,
      };
  }
};

// building time line

function buildTimeline(
  booking:any,
  job:any,
  invoice:any
){
  const jobStatus = job?.status

  const timeline = [
    {
      key: "request_sent",
      title: "Request sent",
      description:
        "Your service request was created.",
      completed: true,
      current: false,
      timestamp: booking.createdAt,
    },

    {
      key: "provider_accepted",
      title: "Provider accepted",
      description:
        "The service provider accepted your request.",
      completed:
        [
          "confirmed",
          "assigned",
        ].includes(booking.status) ||
        Boolean(job),
      current: false,
      timestamp:
        booking.status !== "pending"
          ? booking.updatedAt
          : undefined,
    },

    {
      key: "technician_assigned",
      title: "Technician assigned",
      description:
        "A technician has been assigned to your service.",
      completed:
        Boolean(job) ||
        Boolean(booking.technicianId),
      current: false,
      timestamp:
        job?.createdAt,
    },

    {
      key: "technician_enroute",
      title: "Technician is on the way",
      description:
        "Your technician is travelling to your location.",
      completed:
        [
          "enroute",
          "arrived",
          "otp_verified",
          "in_progress",
          "on_hold",
          "completed",
        ].includes(jobStatus),
      current:
        jobStatus === "enroute",
      timestamp:
        job?.acceptedAt,
    },

    {
      key: "technician_arrived",
      title: "Technician arrived",
      description:
        "Your technician reached the service location.",
      completed:
        [
          "arrived",
          "otp_verified",
          "in_progress",
          "on_hold",
          "completed",
        ].includes(jobStatus),
      current:
        jobStatus === "arrived",
      timestamp:
        job?.arrivedAt,
    },

    {
      key: "service_verified",
      title: "Service verified",
      description:
        "Customer verification was completed.",
      completed:
        [
          "otp_verified",
          "in_progress",
          "on_hold",
          "completed",
        ].includes(jobStatus),
      current:
        jobStatus === "otp_verified",
      timestamp:
        job?.customerOtpVerifiedAt,
    },

    {
      key: "service_in_progress",
      title: "Service in progress",
      description:
        "Your technician is working on your service.",
      completed:
        [
          "in_progress",
          "on_hold",
          "completed",
        ].includes(jobStatus),
      current:
        [
          "in_progress",
          "on_hold",
        ].includes(jobStatus),
      timestamp:
        job?.startTime,
    },

    {
      key: "completed",
      title: "Service completed",
      description:
        "Your service has been completed successfully.",
      completed:
        jobStatus === "completed",
      current:
        jobStatus === "completed",
      timestamp:
        job?.endTime,
    },
  ];
  return timeline;
}

export async function GET(
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    await connectToDb();

    const { customer } = await requireCustomer(session.user.id);

    const { id } = await params;

    /*
     * IMPORTANT:
     *
     * Booking must belong to this customer.
     */
    const booking = await Booking.findOne({
      _id: id,
      customerId: customer._id,
    })
      .populate(
        "serviceProviderId",
        "companyName businessType description email phone address status verificationStatus",
      )
      .populate(
        "serviceOfferingId",
        "name price taxPercent description offerEnabled offerName discountType discountValue",
      )
      .populate("technicianId", "status isActive skills vehicleType userId")
      .lean();

    if (!booking) {
      return NextResponse.json(
        {
          error: "Booking not found",
        },
        { status: 404 },
      );
    };

    /*
     * Job is scoped to both booking and provider.
     */

    const job = await Job.findOne({
      bookingId: booking._id,
      serviceProviderId:
        booking.serviceProviderId?._id || booking.serviceProviderId,
    })
      .populate("technicianId", "status isActive skills vehicleType userId")
      // .populate(
      //   "invoiceId",
      //   "invoiceNumber status grandTotal amountPaid balanceDue razorpayPaymentId paymentReceivedAt",
      // )
      .lean();

      /*
      * Invoice is attaced through the job
      */

      let invoice = null;

      if(job?.invoiceId){
        invoice = await Invoice.findById(
          job.invoiceId,
        )
          .select(
            "invoiceNumber status currency items subtotal discountAmount taxPercent taxAmount grandTotal amountPaid balanceDue razorpayPaymentId paymentMethod paymentReceivedAt issuedAt dueDate",
          )
          .lean();
      };

      /*
     * If job has no invoiceId but booking flow has
     * an invoice related to this job, the query above
     * is enough for current architecture.
     */

      const tracking = getCustomerTracking(job,booking);

      const timeline = buildTimeline(
        booking,
        job,invoice
      );

    return NextResponse.json({
      success: true,

      booking,

      provider:
        booking.serviceProviderId,

      service:
        booking.serviceOfferingId,

      technician:
        job?.technicianId ||
        booking.technicianId ||
        null,

      //job: job || null,
      job,
      invoice,
      tracking,
      timeline,

      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    });
  } catch (error: any) {
    console.error("Customer booking detail error:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to load booking",
      },
      { status: 500 },
    );
  }
}
