import { requireCustomer, requireCustomerProfile } from "@/lib/customer";
import { connectToDb } from "@/lib/db";
//import Booking from "@/models/booking";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import { NextResponse } from "next/server";
import "@/models/technician";
import "@/models/user";
import {ServiceOffering,Customer,Booking, ServiceProvider} from "@/models/index"
//import ServiceProvider from "@/models/ServiceProvider";

import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
export const runtime = 'nodejs';

// export async function GET() {

//     try {
//         await connectToDb();

//         const {customer} = await requireCustomerProfile();

//         console.log("Customer from booking",customer);

//         const booking = await Booking.find({customerId:customer._id})
//                 .sort({createdAt:-1})
//                 .lean();
        
//         //console.log(booking);
//         const bookingIds = booking.map((b:any) => b._id);
//         const jobs = await Job.find({bookingId:{$in:bookingIds}})
//                 .populate({
//                     path:"technicianId",
//                     populate:{path:"userId"}
//                 })
//                 .lean();
//         const invoices = await Invoice.find({customerId:customer._id}).lean();

//         const jobMap = new Map<string,any>();

//         jobs.forEach((job:any) => {
//             jobMap.set(String(job.bookingId),job)
//         });

//         const invoiceMap = new Map<string,any>();
//         invoices.forEach((invoice:any) => {
//             if(invoice.bookingId){
//                 invoiceMap.set(String(invoice.bookingId),invoice);
//             }
//         });

//         const result = booking.map((booking:any) => ({
//             ...booking,
//             job:jobMap.get(String(booking._id)) || null,
//             invoice:invoiceMap.get(String(booking._id)) || null,
//         }));
//         console.log("Result",result);

//         return NextResponse.json({bookings:result});
//      } catch (error:any) {
//        return NextResponse.json({
//         error:error.message || "Server error"
//        },{status:error.status ||  500})
        
//     }
    
// }

// adding new get request for getting bookings info for customer


export async function GET(request: Request) {
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

    const { customer } = await requireCustomer(
      session.user.id,
    );

    const url = new URL(request.url);

    const status = url.searchParams.get("status");

    /*
     * IMPORTANT:
     *
     * Never query all bookings and filter on frontend.
     *
     * The customerId restriction happens at database level.
     */
    const query: Record<string, any> = {
      customerId: customer._id,
    };

    /*
     * Booking-level filters only.
     *
     * "completed" is derived from Job below.
     */
    if (
      status === "confirmed" ||
      status === "assigned" ||
      status === "cancelled" ||
      status === "rescheduled"
    ) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate(
        "serviceProviderId",
        "companyName businessType status verificationStatus",
      )
      .populate(
        "serviceOfferingId",
        "name price taxPercent description offerEnabled offerName discountType discountValue",
      )
      .populate(
        "technicianId",
        "status isActive userId",
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    /*
     * Register/populate Technician model if needed.
     */
    const bookingIds = bookings.map(
      (booking: any) => booking._id,
    );

    const jobs = await Job.find({
      bookingId: {
        $in: bookingIds,
      },
      serviceProviderId: {
        $in: bookings
          .map((booking: any) =>
            booking.serviceProviderId?._id,
          )
          .filter(Boolean),
      },
    })
      .select(
        "bookingId technicianId status paymentStatus invoiceId startTime endTime scheduledAt",
      )
      .lean();

    const jobMap = new Map(
      jobs.map((job: any) => [
        String(job.bookingId),
        job,
      ]),
    );

    const result = bookings.map(
      (booking: any) => {
        const job =
          jobMap.get(
            String(booking._id),
          ) || null;

        let customerStatus:
          | "upcoming"
          | "active"
          | "completed"
          | "cancelled"
          | "pending" = "upcoming";

        if (
          booking.status === "cancelled"
        ) {
          customerStatus = "cancelled";
        } else if (
          job?.status === "completed"
        ) {
          customerStatus = "completed";
        } else if (
          job &&
          [
            "assigned",
            "enroute",
            "arrived",
            "otp_verified",
            "in_progress",
            "on_hold",
          ].includes(job.status)
        ) {
          customerStatus = "active";
        } else if (
          booking.status === "confirmed"
        ) {
          customerStatus = "upcoming";
        } else if (
          booking.status === "assigned"
        ) {
          customerStatus = "active";
        } else {
          customerStatus = "pending";
        }

        return {
          ...booking,

          job,

          customerStatus,

          provider: booking.serviceProviderId,

          serviceOffering:
            booking.serviceOfferingId,

          technician:
            booking.technicianId,
        };
      },
    );

    /*
     * Optional frontend category filtering.
     */
    const filtered =
      status === "completed" ||
      status === "active" ||
      status === "upcoming" ||
      status === "pending"
        ? result.filter(
            (booking: any) =>
              booking.customerStatus ===
              status,
          )
        : result;

    return NextResponse.json({
      success: true,

      bookings: filtered,

      counts: {
        all: result.length,

        upcoming: result.filter(
          (booking: any) =>
            booking.customerStatus ===
            "upcoming",
        ).length,

        active: result.filter(
          (booking: any) =>
            booking.customerStatus ===
            "active",
        ).length,

        completed: result.filter(
          (booking: any) =>
            booking.customerStatus ===
            "completed",
        ).length,

        cancelled: result.filter(
          (booking: any) =>
            booking.customerStatus ===
            "cancelled",
        ).length,

        pending: result.filter(
          (booking: any) =>
            booking.customerStatus ===
            "pending",
        ).length,
      },
    });
  } catch (error: any) {
    console.error(
      "Customer bookings error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load bookings",
      },
      { status: 500 },
    );
  }
}

