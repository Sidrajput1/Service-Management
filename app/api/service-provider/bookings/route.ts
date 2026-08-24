import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import { Customer, ServiceRequest, ServiceOffering,Technician } from "@/models";
import Booking from "@/models/booking";
import mongoose from "mongoose";


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

    const { searchParams } =
      new URL(request.url);

    const status =
      searchParams.get("status");

    const query: Record<string, any> = {
      serviceProviderId: provider._id,
    };

    if (
      status &&
      status !== "all"
    ) {
      query.status = status;
    }

    console.log("mongoose models",mongoose.modelNames())

    const bookings =
      await Booking.find(query)
        .populate(
          "customerId",
          "name phone email"
        )
        .populate(
          "serviceOfferingId",
          "name price offerEnabled offerName discountType discountValue"
        )
        .populate(
          "technicianId",
          "status isActive userId"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      bookings,
    });
  } catch (error: any) {
    console.error(
      "Provider bookings GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load bookings",
      },
      { status: 500 }
    );
  }
}