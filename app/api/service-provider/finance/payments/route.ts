import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

//import Job from "@/models/job";
import Payment from "@/models/payment";
import {Customer,Booking,ServiceRequest,ServiceOffering,Technician,Job} from "@/models/index";


export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectToDb();

    const { provider } =
      await requireServiceProvider(
        session.user.id,
      );

    const url = new URL(request.url);

    const status =
      url.searchParams.get("status") || "success";

    const jobs = await Job.find({
      serviceProviderId: provider._id,
    })
      .select("_id")
      .lean();

    const jobIds = jobs.map(
      (job: any) => job._id,
    );

    if (!jobIds.length) {
      return NextResponse.json({
        success: true,
        payments: [],
      });
    }

    const query: Record<string, any> = {
      jobId: {
        $in: jobIds,
      },
    };

    if (status !== "all") {
      query.status = status;
    }

    const payments =
      await Payment.find(query)
        .populate(
          "invoiceId",
          "invoiceNumber grandTotal status balanceDue",
        )
        .populate(
          "customerId",
          "name phone email",
        )
        .populate(
          "jobId",
          "status paymentStatus bookingId",
        )
        .sort({
          paidAt: -1,
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error(
      "Provider payments error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load payments",
      },
      { status: 500 },
    );
  }
}