import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import Job from "@/models/job";
import Invoice from "@/models/invoice";
import {ServiceOffering,Customer,Booking} from "@/models/index";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

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
      await requireServiceProvider(
        session.user.id,
      );

    const url = new URL(request.url);

    const status =
      url.searchParams.get("status") || "all";

    const jobs =
      await Job.find({
        serviceProviderId:
          provider._id,
      })
        .select("_id")
        .lean();

    const jobIds = jobs.map(
      (job: any) => job._id,
    );

    const query: Record<string, any> = {
      jobId: {
        $in: jobIds,
      },
    };

    if (
      status !== "all"
    ) {
      query.status = status;
    }

    const invoices =
      await Invoice.find(query)
        .populate(
          "customerId",
          "name phone email",
        )
        .populate(
          "bookingId",
          "serviceType scheduledAt address",
        )
        .populate(
          "jobId",
          "status paymentStatus technicianId",
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (error: any) {
    console.error(
      "Provider invoices error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load invoices",
      },
      { status: 500 },
    );
  }
}