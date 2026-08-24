import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import {Customer,Technician,ServiceOffering,Booking} from "@/models/index"
import Job from "@/models/job";
//import Customer from "@/models/customer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDb();

    const { provider } =
      await requireServiceProvider(
        session.user.id
      );

    const url = new URL(request.url);

    const status =
      url.searchParams.get("status");

    const query: Record<string, any> = {
      serviceProviderId:
        provider._id,
    };

    if (
      status &&
      status !== "all"
    ) {
      query.status = status;
    }

    const jobs =
      await Job.find(query)
        .populate(
          "technicianId",
          "status isActive skills vehicleType userId"
        )
        .populate({
          path: "bookingId",
          select:
            "customerId serviceProviderId serviceOfferingId serviceType scheduledAt address pricing status",
          populate: [
            {
              path: "customerId",
              select:
                "name phone email",
            },
            {
              path: "serviceOfferingId",
              select:
                "name price description offerEnabled offerName discountType discountValue",
            },
          ],
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error: any) {
    console.error(
      "Assigned jobs GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load assigned jobs",
      },
      { status: 500 }
    );
  }
}