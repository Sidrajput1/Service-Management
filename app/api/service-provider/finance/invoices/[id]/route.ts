import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import Invoice from "@/models/invoice";
import Job from "@/models/job";
import {ServiceOffering,Customer,Booking} from "@/models/index";

export const runtime = "nodejs";

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
    const session =
      await getServerSession(
        authOptions,
      );

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
     * Important:
     * first find provider-owned jobs,
     * then invoice.
     *
     * This prevents a provider from accessing
     * another provider's invoice by ID.
     */
    const job =
      await Job.findOne({
        _id:
          (
            await Invoice.findById(id)
              .select("jobId")
              .lean()
          )?.jobId,

        serviceProviderId:
          provider._id,
      }).lean();

    if (!job) {
      return NextResponse.json(
        {
          error:
            "Invoice not found",
        },
        {
          status: 404,
        },
      );
    }

    const invoice =
      await Invoice.findOne({
        _id: id,
        jobId: job._id,
      })
        .populate(
          "customerId",
          "name phone email",
        )
        .populate(
          "bookingId",
          "serviceType scheduledAt address pricing notes",
        )
        .populate(
          "jobId",
          "status paymentStatus technicianId partsUsed proofIds startTime endTime",
        )
        .lean();

    if (!invoice) {
      return NextResponse.json(
        {
          error:
            "Invoice not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error(
      "Provider invoice detail error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load invoice",
      },
      {
        status: 500,
      },
    );
  }
}