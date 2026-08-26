import { requireCurrentUser, requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Booking from "@/models/booking";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Lead from "@/models/lead";
import { NextResponse } from "next/server";
import "@/models/technician";
import { ServiceOffering, ServiceProvider } from "@/models";
import {PriceItem} from "@/models/PriceItem";
import { requireCustomer, requireCustomerProfile } from "@/lib/customer";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// export async function GET(){
//     try {
//        await requireRole(['customer']);
//         await connectToDb();
//         const customer = await requireCurrentUser();
//       //const {cutomer} = await requireRole({customer});
//         //console.log(customer);

//         const customerId =  customer.id;

//         const requests = await Lead.find({customerId})
//                         .sort({createdAt:-1})
//                         .lean();

//         const bookings = await Booking.find({customerId: customerId})
//                         .sort({createdAt:-1})
//                         .limit(8)
//                         .lean();

//         const bookingsId = bookings.map((b:any) => b._id);

//         const jobs = await Job.find({bookingId:{$in:bookingsId}})
//             .populate("bookingId")
//       .populate("technicianId")
//       .sort({ createdAt: -1 })
//       .limit(8)
//       .lean();

//        const invoices = await Invoice.find({ customerId: customerId })
//       .sort({ createdAt: -1 })
//       .limit(8)
//       .lean();

//     const activeJobs = jobs.filter((job: any) =>
//       ["assigned", "accepted", "enroute", "arrived", "otp_verified", "in_progress", "on_hold"].includes((job.status || "").toLowerCase())
//     );

//     // const completedJobs = jobs.filter((job: any) => job.status === "completed");

//     // const pendingInvoices = invoices.filter((inv: any) => inv.balanceDue > 0);

//      const completedJobs = jobs.filter(
//       (job: any) => (job.status || "").toLowerCase() === "completed"
//     );

//     const pendingInvoices = invoices.filter(
//       (inv: any) => Number(inv.balanceDue || 0) > 0
//     );

//     const latestRequest = requests[0] || null;
//     const latestJob = jobs[0] || null;

//     return NextResponse.json({
//       summary: {
//         totalRequests: requests.length,
//         activeJobs: activeJobs.length,
//         completedJobs: completedJobs.length,
//         pendingInvoices: pendingInvoices.length,
//       },
//       customer,
//       latestRequest,
//       latestJob,
//       requests,
//       bookings,
//       jobs,
//       invoices,
//     },
//     {
//         headers: {
//           "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
//           Pragma: "no-cache",
//           Expires: "0",
//         },
//       },

//   )
//     } catch (error:any) {
//         return NextResponse.json(
//             {error:error.message || "Server error"},
//             {status:error.status || 500}
//         )
//     }
// }

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

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

    //const { customer } = await requireCustomer(session.user.id);

    const {customer} = await requireCustomerProfile();

    /*
     * ------------------------------------------------
     * BOOKINGS
     * ------------------------------------------------
     */

    const bookings = await Booking.find({
      customerId: customer._id,
    })
      .populate("serviceProviderId", "companyName verificationStatus status")
      .populate(
        "serviceOfferingId",
        "name price offerEnabled offerName discountType discountValue",
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    /*
     * ------------------------------------------------
     * JOBS
     * ------------------------------------------------
     */

    const bookingIds = bookings.map((booking: any) => booking._id);

    const jobs = bookingIds.length
      ? await Job.find({
          bookingId: {
            $in: bookingIds,
          },
        })
          .sort({
            createdAt: -1,
          })
          .lean()
      : [];

    const jobByBooking = new Map(
      jobs.map((job: any) => [String(job.bookingId), job]),
    );

    /*
     * ------------------------------------------------
     * INVOICES
     * ------------------------------------------------
     */

    const invoices = customer._id
      ? await Invoice.find({
          customerId: customer._id,
        })
          .select(
            "_id bookingId jobId status grandTotal amountPaid balanceDue invoiceNumber createdAt",
          )
          .lean()
      : [];

    /*
     * ------------------------------------------------
     * ACTIVITY COUNTS
     * ------------------------------------------------
     */

    const activeBookings = bookings.filter((booking: any) =>
      ["pending", "confirmed", "assigned"].includes(booking.status),
    );

    const now = new Date();

    const upcomingBookings = bookings.filter(
      (booking: any) =>
        ["pending", "confirmed", "assigned"].includes(booking.status) &&
        booking.scheduledAt &&
        new Date(booking.scheduledAt) > now,
    );

    const completedJobs = jobs.filter((job: any) => job.status === "completed");

    const unpaidInvoices = invoices.filter(
      (invoice: any) =>
        ["issued", "partial"].includes(invoice.status) &&
        Number(invoice.balanceDue || 0) > 0,
    );

    /*
     * ------------------------------------------------
     * CONTINUE SERVICE
     * ------------------------------------------------
     *
     * Most recent active booking.
     */

    const continueBooking = activeBookings[0] || null;

    let continueService = null;

    if (continueBooking) {
      const job = jobByBooking.get(String(continueBooking._id));

      continueService = {
        booking: continueBooking,
        job: job || null,
      };
    }

    /*
     * ------------------------------------------------
     * RECENT BOOKINGS
     * ------------------------------------------------
     */

    const recentBookings = bookings.slice(0, 5).map((booking: any) => {
      const job = jobByBooking.get(String(booking._id));

      const invoice = invoices.find(
        (item: any) => String(item.bookingId) === String(booking._id),
      );

      return {
        ...booking,

        job: job || null,

        invoice: invoice || null,
      };
    });

    /*
     * ------------------------------------------------
     * POPULAR SERVICES
     * ------------------------------------------------
     *
     * Count active provider offerings by
     * service name.
     */
    const activeOfferings = await ServiceOffering.find({
      isActive: true,
    })
      .select("name serviceProviderId priceItemId")
      .lean();

    const serviceMap = new Map<
      string,
      {
        id: string;
        name: string;
        providerCount: number;
      }
    >();

    for (const offering of activeOfferings) {
      const name = String(offering.name || "").trim();

      const priceItemId = offering.priceItemId
        ? String(offering.priceItemId)
        : "";

      if (!name || !priceItemId) {
        continue;
      }

      const existing = serviceMap.get(priceItemId);

      if (existing) {
        existing.providerCount += 1;
      } else {
        serviceMap.set(priceItemId, {
          id: priceItemId,
          name,
          providerCount: 1,
        });
      }
    }

    const popularServices = Array.from(serviceMap.values())
      .sort((a, b) => b.providerCount - a.providerCount)
      .slice(0, 6)
      .map((service, index) => ({
        id: service.id,
        name: service.name,
        providerCount: service.providerCount,
        rank: index + 1,
      }));

    // const serviceMap = new Map<
    //   string,
    //   {
    //     name: string;
    //     providerCount: number;
    //   }
    // >();

    // for (const offering of activeOfferings) {
    //   const name = String(offering.name || "").trim();

    //   if (!name) {
    //     continue;
    //   }

    //   const existing = serviceMap.get(name.toLowerCase());

    //   if (existing) {
    //     existing.providerCount += 1;
    //   } else {
    //     serviceMap.set(name.toLowerCase(), {
    //       name,
    //       providerCount: 1,
    //     });
    //   }
    // }

    // const popularServices = Array.from(serviceMap.values())
    //   .sort((a, b) => b.providerCount - a.providerCount)
    //   .slice(0, 6)
    //   .map((service, index) => ({
    //     id: service.name.toLowerCase().replace(/\s+/g, "-"),
    //     name: service.name,
    //     providerCount: service.providerCount,
    //     rank: index + 1,
    //   }));

    return NextResponse.json({
      success: true,

      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },

      activity: {
        activeRequests: activeBookings.length,

        upcoming: upcomingBookings.length,

        completed: completedJobs.length,

        unpaid: unpaidInvoices.length,
      },

      popularServices,

      continueService,

      recentBookings,
    });
  } catch (error: any) {
    console.error("Customer dashboard error:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to load customer dashboard",
      },
      {
        status: error.status || 500,
      },
    );
  }
}
