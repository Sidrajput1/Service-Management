import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";

import ServiceRequest from "@/models/ServiceRequest";
import Booking from "@/models/booking";
import { Customer } from "@/models";
import { notifyBookingAccepted } from "@/lib/notify-events";


export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
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

    const { id } = await params;

    const serviceRequest =
      await ServiceRequest.findOne({
        _id: id,
        serviceProviderId: provider._id,
        status: "open",
      });

    if (!serviceRequest) {
      return NextResponse.json(
        {
          error:
            "Booking request is no longer available",
        },
        { status: 404 }
      );
    }

    /*
     * Create Booking from the request.
     *
     * Pricing is copied, not recalculated.
     */
    const booking =
      await Booking.create({
        customerId:
          serviceRequest.customerId,

        serviceProviderId:
          provider._id,

        serviceOfferingId:
          serviceRequest.serviceOfferingId,

        serviceType:
          serviceRequest.serviceName,

        scheduledAt:
          serviceRequest.preferredDate,

        address:
          serviceRequest.address,

        estimatedPrice:
          serviceRequest.pricing.finalPrice,

        pricing:
          serviceRequest.pricing,

        status: "confirmed",

        notes:
          serviceRequest.description || "",

        createdBy:
          provider.ownerId,
      });

    serviceRequest.status =
      "booked";

    await serviceRequest.save();
     
    //------------------------------------------------------------------------
    // after booking is done , we can send notification to customer 
    //-------------------------------------------------------------------------  
    const customer =
  await Customer.findById(
    booking.customerId,
  ).populate("userId");

const customerUserId =
  customer?.userId?._id
    ? String(
        customer.userId._id,
      )
    : null;

    if (customerUserId) {
  await notifyBookingAccepted({
    customerUserId,

    bookingId:
      booking._id.toString(),

    serviceName:
      booking.serviceType,

    providerName:
      provider.companyName,
  });
}
//-----------------------------------------------------------------
//-----------------------------------------------------------------------

    return NextResponse.json({
      success: true,

      booking: {
        id: booking._id,
        status: booking.status,
        customerId:
          booking.customerId,
        serviceProviderId:
          booking.serviceProviderId,
        serviceOfferingId:
          booking.serviceOfferingId,
        pricing:
          booking.pricing,
      },
    });
  } catch (error: any) {
    console.error(
      "Accept booking request:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to accept booking request",
      },
      { status: 500 }
    );
  }
}