import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";
//import Job from "@/models/job";
import Payment from "@/models/payment";
import Invoice from "@/models/invoice";
import {Customer,Booking,ServiceRequest,ServiceOffering,Technician,Job} from "@/models/index";

export const runtime = "nodejs";


function getStartDate(period:string){
    const now = new Date();

    switch(period){
        case "7d":{
            const date = new Date(now);
            date.setDate(date.getDate() - 7);
            return date;
        };
         case "90d":{
            const date = new Date(now);
            date.setDate(date.getDate() - 90);
            return date;
        };
         case "12m":{
            const date = new Date(now);
            date.setMonth(date.getMonth() - 12);
            return date;
        };

        case "30d":
    default: {
      const date = new Date(now);
      date.setDate(date.getDate() - 30);
      return date;
    }

    }
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
};


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

    const { provider } =
      await requireServiceProvider(session.user.id);

    const url = new URL(request.url);
    const period =
      url.searchParams.get("period") || "30d";

    const startDate = getStartDate(period);

    /*
     * Provider ownership is established through Job.
     *
     * Job.serviceProviderId -> provider
     */
    const jobs = await Job.find({
      serviceProviderId: provider._id,
    })
      .select("_id bookingId technicianId")
      .lean();

    const jobIds = jobs.map(
      (job: any) => job._id,
    );

    if (jobIds.length === 0) {
      return NextResponse.json({
        success: true,
        period,
        overview: {
          totalRevenue: 0,
          periodRevenue: 0,
          pendingAmount: 0,
          totalPaidTransactions: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
        },
        revenueTrend: [],
        recentPayments: [],
        recentInvoices: [],
      });
    }

    /*
     * -------------------------------------------------
     * PAYMENTS
     * -------------------------------------------------
     *
     * Revenue comes from successful payments.
     */
    const allPayments = await Payment.find({
      jobId: {
        $in: jobIds,
      },

      status: "success",
    })
      .populate(
        "invoiceId",
        "invoiceNumber grandTotal status",
      )
      .populate(
        "customerId",
        "name phone email",
      )
      .sort({
        paidAt: -1,
      })
      .lean();

    const totalRevenue = allPayments.reduce(
      (sum: number, payment: any) =>
        sum + Number(payment.amount || 0),
      0,
    );

    const periodPayments = allPayments.filter(
      (payment: any) =>
        payment.paidAt &&
        new Date(payment.paidAt) >= startDate,
    );

    const periodRevenue = periodPayments.reduce(
      (sum: number, payment: any) =>
        sum + Number(payment.amount || 0),
      0,
    );

    /*
     * -------------------------------------------------
     * INVOICES
     * -------------------------------------------------
     */
    const allInvoices = await Invoice.find({
      jobId: {
        $in: jobIds,
      },
    })
      .populate(
        "bookingId",
        "serviceType scheduledAt",
      )
      .populate(
        "customerId",
        "name phone email",
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    const pendingInvoices =
      allInvoices.filter(
        (invoice: any) =>
          ["issued", "partial"].includes(
            invoice.status,
          ) &&
          Number(invoice.balanceDue || 0) > 0,
      );

    const pendingAmount = pendingInvoices.reduce(
      (sum: number, invoice: any) =>
        sum + Number(invoice.balanceDue || 0),
      0,
    );

    /*
     * -------------------------------------------------
     * REVENUE TREND
     * -------------------------------------------------
     *
     * Last 30/90 days: daily buckets
     * 12m: monthly buckets
     */
    const trendMap = new Map<string, number>();

    for (const payment of periodPayments) {
      if (!payment.paidAt) continue;

      const date = new Date(
        payment.paidAt,
      );

      const key =
        period === "12m"
          ? `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, "0")}`
          : `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, "0")}-${String(
              date.getDate(),
            ).padStart(2, "0")}`;

      trendMap.set(
        key,
        roundMoney(
          (trendMap.get(key) || 0) +
            Number(payment.amount || 0),
        ),
      );
    }

    const revenueTrend = Array.from(
      trendMap.entries(),
    )
      .sort(([a], [b]) =>
        a.localeCompare(b),
      )
      .map(([date, revenue]) => ({
        date,
        revenue,
      }));

    return NextResponse.json({
      success: true,

      period,

      overview: {
        totalRevenue:
          roundMoney(totalRevenue),

        periodRevenue:
          roundMoney(periodRevenue),

        pendingAmount:
          roundMoney(pendingAmount),

        totalPaidTransactions:
          allPayments.length,

        totalInvoices:
          allInvoices.length,

        paidInvoices:
          allInvoices.filter(
            (invoice: any) =>
              invoice.status === "paid",
          ).length,

        pendingInvoices:
          pendingInvoices.length,
      },

      revenueTrend,

      recentPayments:
        allPayments.slice(0, 10),

      recentInvoices:
        allInvoices.slice(0, 10),
    });
  } catch (error: any) {
    console.error(
      "Provider finance error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load finance data",
      },
      { status: 500 },
    );
  }
}
