import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";

import { Technician } from "@/models/index";
import Job from "@/models/job";


export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      partIndex: string;
    }>;
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

    const { id, partIndex } =
      await params;

    const index =
      Number(partIndex);

    if (
      !Number.isInteger(index) ||
      index < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid part index",
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
            "Job not found or cannot be modified",
        },
        {
          status: 404,
        },
      );
    }

    const parts =
      Array.isArray(
        job.partsUsed,
      )
        ? [...job.partsUsed]
        : [];

    if (index >= parts.length) {
      return NextResponse.json(
        {
          error:
            "Part not found",
        },
        {
          status: 404,
        },
      );
    }

    parts.splice(index, 1);

    job.partsUsed =
      parts as any;

    await job.save();

    return NextResponse.json({
      success: true,

      partsUsed:
        job.partsUsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to remove part",
      },
      {
        status: 500,
      },
    );
  }
}