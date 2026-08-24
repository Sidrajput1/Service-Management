import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";
import PriceItem from "@/models/PriceItem";

export const runtime = "nodejs";

/**
 * Get all active platform services/parts that can be selected
 * by a service provider.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDb();

    const { provider } = await requireServiceProvider(
      session.user.id
    );

    const services = await PriceItem.find({
      itemType: "service",
      isActive: true,
    })
     .select("_id name type price")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      services,
      selectedServiceIds: (provider.services || []).map(
        (id: any) => String(id)
      ),
    });
  } catch (error: any) {
    console.error("Provider services GET:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Unable to load services",
      },
      { status: 500 }
    );
  }
}

/**
 * Save provider service selection.
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDb();

    const { provider } = await requireServiceProvider(
      session.user.id
    );

    const body = await request.json();

    const serviceIds = Array.isArray(body.serviceIds)
      ? body.serviceIds.map(String)
      : [];

    if (serviceIds.length === 0) {
      return NextResponse.json(
        {
          error: "Select at least one service",
        },
        { status: 400 }
      );
    }

    const validServices = await PriceItem.find({
      _id: { $in: serviceIds },
      itemType: "service",
      isActive: true,
    })
      .select("_id")
      .lean();

    if (validServices.length !== serviceIds.length) {
      return NextResponse.json(
        {
          error:
            "One or more selected services are invalid",
        },
        { status: 400 }
      );
    }

    provider.services = validServices.map(
      (item: any) => item._id
    );

    await provider.save();

    return NextResponse.json({
      success: true,
      serviceIds: provider.services.map(
        (id: any) => String(id)
      ),
    });
  } catch (error: any) {
    console.error("Provider services PUT:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Unable to save services",
      },
      { status: 500 }
    );
  }
}