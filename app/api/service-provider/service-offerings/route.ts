import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import PriceItem from "@/models/PriceItem";
import ServiceOffering from "@/models/ServiceOffering";

export const runtime = "nodejs";

/**
 * GET provider's service offerings
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

    const { provider } =
      await requireServiceProvider(
        session.user.id
      );

    const offerings =
      await ServiceOffering.find({
        serviceProviderId: provider._id,
      })
        .populate(
          "priceItemId",
          "name itemType price taxPercent"
        )
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json({
      success: true,
      offerings,
    });
  } catch (error: any) {
    console.error(
      "GET service offerings:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load service offerings",
      },
      { status: 500 }
    );
  }
}

/**
 * CREATE provider service offering
 */
export async function POST(
  request: Request
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

    const body = await request.json();

    const {
      priceItemId,
      price,
      taxPercent,
      description,

      offerEnabled = false,
      offerName = "",
      discountType,
      discountValue = 0,
      offerStartsAt,
      offerEndsAt,
    } = body;

    const normalizedDescription =
      typeof description === "string"
        ? description
        : String(description ?? "");

    const normalizedOfferName =
      typeof offerName === "string"
        ? offerName
        : String(offerName ?? "");

    if (!priceItemId) {
      return NextResponse.json(
        {
          error:
            "Service item is required",
        },
        { status: 400 }
      );
    }

    const priceItem =
      await PriceItem.findOne({
        _id: priceItemId,
        itemType: "service",
        isActive: true,
      }).lean();

    if (!priceItem) {
      return NextResponse.json(
        {
          error:
            "Selected service is not available",
        },
        { status: 400 }
      );
    }

    const providerPrice =
      Number(price);

    if (
      !Number.isFinite(providerPrice) ||
      providerPrice < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid service price",
        },
        { status: 400 }
      );
    }

    const existingOffering =
      await ServiceOffering.findOne({
        serviceProviderId:
          provider._id,
        priceItemId,
      });

    // if (existingOffering) {
    //   return NextResponse.json(
    //     {
    //       error:
    //         "You already offer this service",
    //     },
    //     { status: 409 }
    //   );
    // }

    if (existingOffering) {
      if (!existingOffering.isActive) {
        existingOffering.name =
          priceItem.name.toString();
        existingOffering.price =
          providerPrice;

        existingOffering.taxPercent =
          taxPercent !== undefined
            ? Number(taxPercent)
            : priceItem.taxPercent ?? 18;

        existingOffering.description =
          description || "";

        existingOffering.offerEnabled =
          Boolean(offerEnabled);

        existingOffering.offerName =
          offerEnabled
            ? normalizedOfferName.trim()
            : "";

        existingOffering.discountType =
          offerEnabled
            ? discountType
            : undefined;

        existingOffering.discountValue =
          offerEnabled
            ? Number(discountValue)
            : 0;

        existingOffering.offerStartsAt =
          offerStartsAt
            ? new Date(offerStartsAt)
            : undefined;

        existingOffering.offerEndsAt =
          offerEndsAt
            ? new Date(offerEndsAt)
            : undefined;

        existingOffering.isActive = true;

        await existingOffering.save();

        return NextResponse.json({
          success: true,
          offering: existingOffering,
          reactivated: true,
        });
      }

      return NextResponse.json(
        {
          error:
            "You already offer this service",
        },
        { status: 409 }
      );
    }

    if (offerEnabled) {
      if (!offerName?.trim()) {
        return NextResponse.json(
          {
            error:
              "Offer name is required when an offer is enabled",
          },
          { status: 400 }
        );
      }

      if (
        !["percentage", "flat"].includes(
          discountType
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Discount type is required",
          },
          { status: 400 }
        );
      }

      const discount =
        Number(discountValue);

      if (
        !Number.isFinite(discount) ||
        discount <= 0
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
        discountType === "percentage" &&
        discount > 100
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
        discountType === "flat" &&
        discount > providerPrice
      ) {
        return NextResponse.json(
          {
            error:
              "Flat discount cannot exceed service price",
          },
          { status: 400 }
        );
      }
    }

    const offering =
      await ServiceOffering.create({
        serviceProviderId:
          provider._id,

        priceItemId:
          priceItem._id,

        // Snapshot the platform service name
        name: priceItem.name,

        price: providerPrice,

        taxPercent:
          taxPercent !== undefined
            ? Number(taxPercent)
            : priceItem.taxPercent ?? 18,

        description:
          description || "",

        isActive: true,

        offerEnabled:
          Boolean(offerEnabled),

        offerName:
          offerEnabled
            ? offerName.trim()
            : "",

        discountType:
          offerEnabled
            ? discountType
            : undefined,

        discountValue:
          offerEnabled
            ? Number(discountValue)
            : 0,

        offerStartsAt:
          offerStartsAt
            ? new Date(offerStartsAt)
            : undefined,

        offerEndsAt:
          offerEndsAt
            ? new Date(offerEndsAt)
            : undefined,
      });

    return NextResponse.json(
      {
        success: true,
        offering,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "POST service offering:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to create service offering",
      },
      { status: 500 }
    );
  }
}