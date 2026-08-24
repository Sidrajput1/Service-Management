import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";


import User from "@/models/user";
import { Technician } from "@/models";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectToDb();

    const { provider } =
      await requireServiceProvider(
        session.user.id,
      );

    const { id } = await params;

    const technician =
      await Technician.findOne({
        _id: id,
        serviceProviderId:
          provider._id,
      })
        .populate(
          "userId",
          "name email phone",
        )
        .lean();

    if (!technician) {
      return NextResponse.json(
        {
          error:
            "Technician not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      technician,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load technician",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
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

    const body = await request.json();

    const technician =
      await Technician.findOne({
        _id: id,
        serviceProviderId:
          provider._id,
      });

    if (!technician) {
      return NextResponse.json(
        {
          error:
            "Technician not found",
        },
        {
          status: 404,
        },
      );
    }

    if (
      Array.isArray(
        body.skills,
      )
    ) {
      technician.skills =
        body.skills
          .map((skill: unknown) =>
            String(skill).trim(),
          )
          .filter(Boolean);
    }

    if (
      body.vehicleType !==
      undefined
    ) {
      technician.vehicleType =
        body.vehicleType;
    }

    if (
      body.isActive !==
      undefined
    ) {
      technician.isActive =
        Boolean(
          body.isActive,
        );
    }

    /*
     * Don't allow provider to manually
     * change a busy technician to available
     * while they still have an active job.
     */
    if (
      body.status !==
        undefined &&
      body.status !==
        technician.status
    ) {
      if (
        technician.status ===
          "busy" &&
        body.status !==
          "busy"
      ) {
        return NextResponse.json(
          {
            error:
              "Busy technician cannot change status until the active job is completed",
          },
          {
            status: 409,
          },
        );
      }

      const allowed = [
        "offline",
        "available",
        "busy",
        "on_leave",
      ];

      if (
        allowed.includes(
          body.status,
        )
      ) {
        technician.status =
          body.status;
      }
    }

    await technician.save();

    /*
     * Update the linked User's basic identity info
     * if provider sent them.
     */
    if (
      body.name !==
        undefined ||
      body.phone !==
        undefined ||
      body.email !==
        undefined
    ) {
      const user =
        await User.findById(
          technician.userId,
        );

      if (user) {
        if (
          body.name !==
          undefined
        ) {
          user.name =
            String(
              body.name,
            ).trim();
        }

        if (
          body.phone !==
          undefined
        ) {
          user.phone =
            String(
              body.phone,
            ).trim();
        }

        if (
          body.email !==
          undefined
        ) {
          user.email =
            String(
              body.email,
            )
              .trim()
              .toLowerCase();
        }

        await user.save();
      }
    }

    return NextResponse.json({
      success: true,
      technician,
    });
  } catch (error: any) {
    console.error(
      "Update technician:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to update technician",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
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

    const technician =
      await Technician.findOne({
        _id: id,
        serviceProviderId:
          provider._id,
      });

    if (!technician) {
      return NextResponse.json(
        {
          error:
            "Technician not found",
        },
        {
          status: 404,
        },
      );
    }

    if (
      technician.status ===
      "busy"
    ) {
      return NextResponse.json(
        {
          error:
            "Busy technician cannot be deactivated while handling an active job",
        },
        {
          status: 409,
        },
      );
    }

    technician.isActive =
      false;

    technician.status =
      "offline";

    await technician.save();

    return NextResponse.json({
      success: true,
      message:
        "Technician deactivated",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to deactivate technician",
      },
      {
        status: 500,
      },
    );
  }
}