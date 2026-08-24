import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";
import Booking from "@/models/booking";
import Job from "@/models/job";
import Technician from "@/models/technician";
//import ServiceOffering from "@/models/ServiceOffering";
import Invoice from "@/models/invoice";
import { Customer, ServiceRequest, ServiceOffering } from "@/models";

export const runtime = "nodejs";

const ACTIVE_JOB_STATUSES = [
  "scheduled",
  "assigned",
  "enroute",
  "arrived",
  "otp_verified",
  "in_progress",
  "on_hold",
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDb();

    const { provider } = await requireServiceProvider(session.user.id);

    const providerId = provider._id;

    const [
      pendingBookingRequests,
      confirmedBookings,
      activeJobs,
      completedJobs,
      technicians,
      availableTechnicians,
      activeServices,
      customerIds,
      recentBookings,
      activeJobList,
      recentInvoices,
      revenueResult,
    ] = await Promise.all([
      Booking.countDocuments({
        serviceProviderId: providerId,
        status: "pending",
      }),

      Booking.countDocuments({
        serviceProviderId: providerId,
        status: {
          $in: ["confirmed", "assigned", "rescheduled"],
        },
      }),

      Job.countDocuments({
        serviceProviderId: providerId,
        status: {
          $in: ACTIVE_JOB_STATUSES,
        },
      }),

      Job.countDocuments({
        serviceProviderId: providerId,
        status: "completed",
      }),
      Technician.countDocuments({
        serviceProviderId: providerId,
        isActive: true,
      }),

      Technician.countDocuments({
        serviceProviderId: providerId,
        isActive: true,
        status: "available",
      }),

      ServiceOffering.countDocuments({
        serviceProviderId: providerId,
        isActive: true,
      }),

      Booking.distinct("customerId", {
        serviceProviderId: providerId,
      }),

      Booking.find({
        serviceProviderId: providerId,
      })
        .populate("customerId", "name phone email")
        .populate(
          "serviceOfferingId",
          "name price offerEnabled offerName discountType discountValue",
        )
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      Job.find({
        serviceProviderId: providerId,
        status: {
          $in: ACTIVE_JOB_STATUSES,
        },
      })
        .populate({
          path: "technicianId",
          select: "status isActive skills userId",
          populate: {
            path: "userId",
            select: "name phone email",
          },
        })
        .populate({
          path: "bookingId",
          select:
            "customerId serviceType serviceOfferingId scheduledAt address",
          populate: {
            path: "customerId",
            select: "name phone email",
          },
        })
        .sort({ scheduledAt: 1, createdAt: -1 })
        .limit(8)
        .lean(),

      Invoice.aggregate([
        {
          $lookup: {
            from: "jobs",
            localField: "jobId",
            foreignField: "_id",
            as: "job",
          },
        },

        {
          $unwind: "$job",
        },

        {
          $match: {
            "job.serviceProviderId": providerId,
          },
        },

        {
          $project: {
            _id: 1,
            invoiceNumber: 1,
            status: 1,
            grandTotal: 1,
            amountPaid: 1,
            balanceDue: 1,
            createdAt: 1,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },

        {
          $limit: 8,
        },
      ]),

      Invoice.aggregate([
        {
          $lookup: {
            from: "jobs",
            localField: "jobId",
            foreignField: "_id",
            as: "job",
          },
        },

        {
          $unwind: "$job",
        },

        {
          $match: {
            "job.serviceProviderId": providerId,
          },
        },

        {
          $group: {
            _id: null,
            revenue: {
              $sum: {
                $ifNull: ["$amountPaid", 0],
              },
            },
          },
        },
      ]),
    ]);

    // last 7 days revenue

    const sevenDaysAgo = new Date();

    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const revenueTrend = await Invoice.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },

      {
        $unwind: "$job",
      },

      {
        $match: {
          "job.serviceProviderId": providerId,

          createdAt: {
            $gte: sevenDaysAgo,
          },
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

          revenue: {
            $sum: {
              $ifNull: ["$amountPaid", 0],
            },
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const revenue = revenueResult?.[0]?.revenue || 0;

    const trialEndsAt = provider.trialEndsAt
      ? new Date(provider.trialEndsAt)
      : null;

    let trialDaysRemaining = null;

    if (trialEndsAt) {
      const diff = trialEndsAt.getTime() - Date.now();

      trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,

      provider: {
        id: provider._id,
        companyName: provider.companyName,
        verificationStatus: provider.verificationStatus,
        status: provider.status,

        trial: {
          startedAt: provider.trialStartedAt,
          endsAt: provider.trialEndsAt,
          daysRemaining: trialDaysRemaining,
        },
      },

      stats: {
        pendingBookingRequests,
        confirmedBookings,
        activeJobs,
        completedJobs,
        technicians,
        availableTechnicians,
        activeServices,
        customers: customerIds.length,
        revenue,
      },

      recentBookings,

      activeJobsList: activeJobList,

      recentInvoices,

      revenueTrend,
    });
  } catch (error: any) {
    console.error("Provider dashboard error:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to load provider dashboard",
      },
      { status: 500 },
    );
  }
}
