import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";

import { Technician } from "@/models";
import Job from "@/models/job";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const session =
      await getServerSession(authOptions);

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

    const technician =
      await Technician.findOne({
        userId: session.user.id,
        isActive: true,
      });

    if (!technician) {
      return NextResponse.json(
        {
          error:
            "Technician profile not found",
        },
        {
          status: 404,
        },
      );
    }

    const { id } = await params;

    const body =
      await request.json();

    const partName =
      String(
        body.partName || "",
      ).trim();

    const qty =
      Number(body.qty);

    const price =
      Number(body.price);

    if (!partName) {
      return NextResponse.json(
        {
          error:
            "Part name is required",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Quantity must be greater than zero",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid part price",
        },
        {
          status: 400,
        },
      );
    }

    const job =
      await Job.findOne({
        _id: id,

        technicianId:
          technician._id,

        status: {
          $in: [
            "otp_verified",
            "in_progress",
            "on_hold",
          ],
        },
      });

    if (!job) {
      return NextResponse.json(
        {
          error:
            "Parts can only be added while the service is active",
        },
        {
          status: 400,
        },
      );
    }

    const existingParts =
      Array.isArray(
        job.partsUsed,
      )
        ? [...job.partsUsed]
        : [];

    existingParts.push({
      partName,
      qty,
      price,
    });

    job.partsUsed =
      existingParts as any;

    await job.save();

    return NextResponse.json({
      success: true,

      partsUsed:
        job.partsUsed,
    });
  } catch (error: any) {
    console.error(
      "Add job part error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to add part",
      },
      {
        status: 500,
      },
    );
  }
}