import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireCustomer } from "@/lib/customer";

import ServiceRequest from "@/models/ServiceRequest";
import ServiceOffering from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";

export const runtime = "nodejs";

function isOfferActive(offering: any) {
  if (!offering.offerEnabled) {
    return false;
  }

  const now = new Date();

  if (offering.offerStartsAt && new Date(offering.offerStartsAt) > now) {
    return false;
  }

  if (offering.offerEndsAt && new Date(offering.offerEndsAt) < now) {
    return false;
  }

  return true;
}

function calculatePricing(offering: any, offerActive: boolean) {
  const basePrice = Number(offering.price) || 0;

  let discountAmount = 0;

  if (offerActive) {
    const value = Number(offering.discountValue || 0);

    if (offering.discountType === "percentage") {
      discountAmount = (basePrice * value) / 100;
    }

    if (offering.discountType === "flat") {
      discountAmount = value;
    }
  }

  discountAmount = Math.min(discountAmount, basePrice);

  // return {
  //   basePrice,

  //   discountAmount,

  //   finalPrice: basePrice - discountAmount,

  //   discountType: offerActive ? offering.discountType : undefined,

  //   discountValue: offerActive ? offering.discountValue : 0,

  //   offerName: offerActive ? offering.offerName : undefined,
  // };

  return {
  basePrice,

  discountAmount,

  finalPrice:
    basePrice - discountAmount,

  discountType:
    offerActive
      ? offering.discountType
      : undefined,

  discountValue:
    offerActive
      ? offering.discountValue
      : 0,

  offerName:
    offerActive
      ? offering.offerName
      : undefined,

  taxPercent:
    Number(
      offering.taxPercent ?? 18
    ),
};
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDb();

    const { customer } = await requireCustomer(session.user.id);

    const body = await request.json();

    const { serviceOfferingId, address, preferredDate, description } = body;

    if (!serviceOfferingId) {
      return NextResponse.json(
        {
          error: "Service offering is required",
        },
        { status: 400 },
      );
    }

    if (!address?.addressLine || !address?.city || !address?.pincode) {
      return NextResponse.json(
        {
          error: "Complete service address is required",
        },
        { status: 400 },
      );
    }

    const offering = await ServiceOffering.findById(serviceOfferingId)
      .populate("serviceProviderId", "companyName status verificationStatus")
      .populate("priceItemId", "name itemType")
      .lean();

    if (!offering) {
      return NextResponse.json(
        {
          error: "Service offering not found",
        },
        { status: 404 },
      );
    }

    const provider = offering.serviceProviderId as any;

    if (
      !provider ||
      provider.status !== "active" ||
      provider.verificationStatus !== "verified"
    ) {
      return NextResponse.json(
        {
          error: "This provider is not currently available",
        },
        { status: 400 },
      );
    }

    if (!offering.isActive) {
      return NextResponse.json(
        {
          error: "This service is no longer available",
        },
        { status: 400 },
      );
    }

    const offerActive = isOfferActive(offering);

    const pricing = calculatePricing(offering, offerActive);

    const serviceRequest = await ServiceRequest.create({
      customerId: customer._id,

      serviceProviderId: provider._id,

      serviceOfferingId: offering._id,

      priceItemId: offering.priceItemId._id,

      serviceName: offering.name,

      description: description || "",

      address,

      preferredDate: preferredDate ? new Date(preferredDate) : undefined,

      pricing,

      status: "open",
    });

    return NextResponse.json(
      {
        success: true,

        serviceRequest: {
          id: serviceRequest._id,

          status: serviceRequest.status,

          serviceName: serviceRequest.serviceName,

          provider: {
            id: provider._id,
            companyName: provider.companyName,
          },

          pricing: serviceRequest.pricing,
           
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Create customer service request:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to create service request",
      },
      { status: 500 },
    );
  }
}
