import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import ServiceOffering from "@/models/ServiceOffering";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
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
      await requireServiceProvider(
        session.user.id
      );

    const { id } = await params;

    const offering =
      await ServiceOffering.findOne({
        _id: id,
        serviceProviderId:
          provider._id,
      });

    if (!offering) {
      return NextResponse.json(
        {
          error:
            "Service offering not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid service price",
          },
          { status: 400 }
        );
      }

      offering.price = price;
    }

    if (
      body.taxPercent !== undefined
    ) {
      offering.taxPercent = Number(
        body.taxPercent
      );
    }

    if (
      body.description !== undefined
    ) {
      offering.description =
        body.description;
    }

    if (
      body.isActive !== undefined
    ) {
      offering.isActive =
        Boolean(body.isActive);
    }

    if (
      body.offerEnabled !== undefined
    ) {
      offering.offerEnabled =
        Boolean(body.offerEnabled);
    }

    if (
      body.offerName !== undefined
    ) {
      offering.offerName =
        body.offerName;
    }

    if (
      body.discountType !== undefined
    ) {
      offering.discountType =
        body.discountType;
    }

    if (
      body.discountValue !== undefined
    ) {
      offering.discountValue =
        Number(body.discountValue);
    }

    if (
      body.offerStartsAt !== undefined
    ) {
      offering.offerStartsAt =
        body.offerStartsAt
          ? new Date(body.offerStartsAt)
          : undefined;
    }

    if (
      body.offerEndsAt !== undefined
    ) {
      offering.offerEndsAt =
        body.offerEndsAt
          ? new Date(body.offerEndsAt)
          : undefined;
    }

    /*
     * Validate offer after updates
     */
    if (offering.offerEnabled) {
      if (
        !offering.offerName?.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Offer name is required",
          },
          { status: 400 }
        );
      }

      if (
        !offering.discountType
      ) {
        return NextResponse.json(
          {
            error:
              "Discount type is required",
          },
          { status: 400 }
        );
      }

      if (
        !offering.discountValue ||
        offering.discountValue <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Discount value must be greater than zero",
          },
          { status: 400 }
        );
      }

      if (
        offering.discountType ===
          "percentage" &&
        offering.discountValue > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Percentage discount cannot exceed 100%",
          },
          { status: 400 }
        );
      }

      if (
        offering.discountType === "flat" &&
        offering.discountValue >
          offering.price
      ) {
        return NextResponse.json(
          {
            error:
              "Flat discount cannot exceed service price",
          },
          { status: 400 }
        );
      }

      if (
        offering.offerStartsAt &&
        offering.offerEndsAt &&
        offering.offerEndsAt <=
          offering.offerStartsAt
      ) {
        return NextResponse.json(
          {
            error:
              "Offer end date must be after start date",
          },
          { status: 400 }
        );
      }
    }

    await offering.save();

    return NextResponse.json({
      success: true,
      offering,
    });
  } catch (error: any) {
    console.error(
      "PATCH service offering:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to update service offering",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
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
      await requireServiceProvider(
        session.user.id
      );

    const { id } = await params;

    const offering =
      await ServiceOffering.findOne({
        _id: id,
        serviceProviderId:
          provider._id,
      });

    if (!offering) {
      return NextResponse.json(
        {
          error:
            "Service offering not found",
        },
        { status: 404 }
      );
    }

    /*
     * Don't actually delete it.
     * Disable instead, because old bookings
     * may reference it.
     */
    offering.isActive = false;

    await offering.save();

    return NextResponse.json({
      success: true,
      message:
        "Service offering disabled",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to disable service offering",
      },
      { status: 500 }
    );
  }
}