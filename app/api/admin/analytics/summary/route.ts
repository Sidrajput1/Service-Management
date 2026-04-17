import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Booking from "@/models/booking";
import Customer from "@/models/customer";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Lead from "@/models/lead";
import Payment from "@/models/payment";
import Technician from "@/models/technician";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';

function getDateRange(range: string) {
  const now = new Date();
  const start = new Date();

  switch (range) {
    case "24h":
      start.setHours(now.getHours() - 24);
      break;
    case "7d":
      start.setDate(now.getDate() - 7);
      break;
    case "30d":
      start.setDate(now.getDate() - 30);
      break;
    case "90d":
      start.setDate(now.getDate() - 90);
      break;
    default:
      start.setFullYear(now.getFullYear() - 10);
  }

  return { start, end: now };
}

function dateGroupStage(field: string) {
  return [
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${field}`,
          },
        },
        value: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
}

function amountGroupStage(field: string) {
  return [
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${field}`,
          },
        },
        value: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ];
}

export async function GET(request:Request){
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();

        const url = new URL(request.url);

        const range = url.searchParams.get("range") || "30d";
        const {start,end} = getDateRange(range);

        const leadDateFilter = {createdAt :  {$gte:start,$lte:end}};
        const jobDateFilter = {createdAt:{$gte:start , $lte:end}};

        const paymentDateFilter = {
            $or :[
                {paidAt:{$gte:start , $lte:end}},
                {createdAt:{$gte:start,$lte:end}}
            ],
        };

        const [
            totalLeads,
            totalBookings,
            totalJobs,
      totalCustomers,
      totalTechnicians,
      totalInvoices,
      totalPayments,

      pendingLeads,
      pendingBookings,
      pendingJobs,
      completedJobs,
      activeJobs,

      leadStatusAgg,
      leadSourceAgg,
      jobStatusAgg,
      invoiceStatusAgg,
      technicianStatusAgg,

      revenueAgg,
      revenueTrendAgg,
      leadTrendAgg,
      completedJobTrendAgg,

      paidInvoicesCount,
      totalDueAgg,
      topTechnicians,
      recentJobs,
      recentInvoices,
      recentPayments,
        ] = await Promise.all([
Lead.countDocuments(leadDateFilter),
      Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Job.countDocuments(jobDateFilter),
      Customer.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Technician.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Invoice.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Payment.countDocuments(paymentDateFilter),

      Lead.countDocuments({
        status: { $in: ["new", "contacted", "interested", "quotation_sent"] },
        createdAt: { $gte: start, $lte: end },
      }),
      Booking.countDocuments({
        status: { $in: ["pending", "confirmed"] },
        createdAt: { $gte: start, $lte: end },
      }),
      Job.countDocuments({
        status: { $nin: ["completed", "cancelled"] },
        createdAt: { $gte: start, $lte: end },
      }),
      Job.countDocuments({
        status: "completed",
        createdAt: { $gte: start, $lte: end },
      }),
      Job.countDocuments({
        status: { $in: ["assigned", "accepted", "arrived", "otp_verified", "in_progress", "on_hold"] },
        createdAt: { $gte: start, $lte: end },
      }),

      Lead.aggregate([
        { $match: leadDateFilter },
        {
          $group: {
            _id: "$status",
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Lead.aggregate([
        { $match: leadDateFilter },
        {
          $group: {
            _id: "$source",
            value: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
      ]),
      Job.aggregate([
        { $match: jobDateFilter },
        {
          $group: {
            _id: "$status",
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$status",
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Technician.aggregate([
        {
          $group: {
            _id: "$status",
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Payment.aggregate([
        {
          $match: {
            status: "success",
            ...paymentDateFilter,
          },
        },
        {
          $group: {
            _id: null,
            value: { $sum: "$amount" },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: "success",
            ...paymentDateFilter,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $ifNull: ["$paidAt", "$createdAt"] },
              },
            },
            value: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Lead.aggregate([
        { $match: leadDateFilter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Job.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$updatedAt",
              },
            },
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Invoice.countDocuments({
        status: "paid",
        createdAt: { $gte: start, $lte: end },
      }),
      Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            value: { $sum: "$balanceDue" },
          },
        },
      ]),

      Technician.find()
        .populate("userId")
        .sort({ jobsCompleted: -1 })
        .limit(5)
        .lean(),
      Job.find({ createdAt: { $gte: start, $lte: end } })
        .populate("bookingId")
        .populate("technicianId")
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
      Invoice.find({ createdAt: { $gte: start, $lte: end } })
        .populate("customerId")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Payment.find(paymentDateFilter)
        .populate("invoiceId")
        .populate("customerId")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
        ]);

         const totalRevenue = revenueAgg?.[0]?.value || 0;
    const totalDue = totalDueAgg?.[0]?.value || 0;
    const paidInvoices = paidInvoicesCount || 0;
    const avgTicket = paidInvoices > 0 ? totalRevenue / paidInvoices : 0;

    const leadTrendMap = new Map(leadTrendAgg.map((x: any) => [x._id, x.value]));
    const revenueTrendMap = new Map(revenueTrendAgg.map((x: any) => [x._id, x.value]));
    const completedTrendMap = new Map(completedJobTrendAgg.map((x: any) => [x._id, x.value]));

    const allDates = Array.from(
      new Set([
        ...leadTrendAgg.map((x: any) => x._id),
        ...revenueTrendAgg.map((x: any) => x._id),
        ...completedJobTrendAgg.map((x: any) => x._id),
      ])
    ).sort();

    const trendData = allDates.map((date) => ({
      date,
      leads: leadTrendMap.get(date) || 0,
      revenue: revenueTrendMap.get(date) || 0,
      completedJobs: completedTrendMap.get(date) || 0,
    }));

    const leadSourceMap = leadSourceAgg.map((x: any) => ({
      name: x._id || "unknown",
      value: x.value,
    }));

    const leadStatusMap = leadStatusAgg.map((x: any) => ({
      name: x._id || "unknown",
      value: x.value,
    }));

    const jobStatusMap = jobStatusAgg.map((x: any) => ({
      name: x._id || "unknown",
      value: x.value,
    }));

    const invoiceStatusMap = invoiceStatusAgg.map((x: any) => ({
      name: x._id || "unknown",
      value: x.value,
    }));

    const technicianStatusMap = technicianStatusAgg.map((x: any) => ({
      name: x._id || "unknown",
      value: x.value,
    }));

    const conversionRate =
      totalLeads > 0 ? Math.round((totalBookings / totalLeads) * 1000) / 10 : 0;

    return NextResponse.json({
      range,
      start,
      end,
      summary: {
        totalLeads,
        totalBookings,
        totalJobs,
        totalCustomers,
        totalTechnicians,
        totalInvoices,
        totalPayments,
        totalRevenue,
        totalDue,
        avgTicket,
        conversionRate,
        pendingLeads,
        pendingBookings,
        pendingJobs,
        completedJobs,
        activeJobs,
      },
      charts: {
        trendData,
        leadSourceMap,
        leadStatusMap,
        jobStatusMap,
        invoiceStatusMap,
        technicianStatusMap,
      },
      topTechnicians: topTechnicians.map((tech: any) => ({
        id: tech._id,
        name: tech.userId?.name || tech.userId?.email || "Technician",
        status: tech.status,
        rating: tech.rating || 0,
        jobsCompleted: tech.jobsCompleted || 0,
      })),
      recentJobs,
      recentInvoices,
      recentPayments,
    });
    } catch (err:any) {
        return NextResponse.json(
            {error:err.message || "Server error"},
            {status:err.status || 500}
        )
    }

}