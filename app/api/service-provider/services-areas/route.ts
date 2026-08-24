import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireServiceProvider } from "@/lib/service-provider";
import { connectToDb } from "@/lib/db";

export const runtime = "nodejs";

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

    const { provider } =
      await requireServiceProvider(session.user.id);

    return NextResponse.json({
      success: true,
      serviceAreas: provider.serviceAreas || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load service areas",
      },
      { status: 500 }
    );
  }
}

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

    const { provider } =
      await requireServiceProvider(session.user.id);

    const body = await request.json();

    const areas = Array.isArray(body.serviceAreas)
      ? body.serviceAreas
          .map((value: unknown) =>
            String(value).trim()
          )
          .filter(Boolean)
      : [];

    if (!areas.length) {
      return NextResponse.json(
        {
          error:
            "Add at least one service area",
        },
        { status: 400 }
      );
    }

    provider.serviceAreas = Array.from(
      new Set(areas)
    );

    await provider.save();

    return NextResponse.json({
      success: true,
      serviceAreas: provider.serviceAreas,
    });
  } catch (error: any) {
    console.error("Service area update:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to save service areas",
      },
      { status: 500 }
    );
  }
}