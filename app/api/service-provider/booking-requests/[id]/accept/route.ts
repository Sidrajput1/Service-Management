import mongoose from "mongoose";
import { requireProvider } from "@/lib/service-provider";

import ServiceRequest from "@/models/ServiceRequest";
import Booking from "@/models/booking";
import { Customer } from "@/models";
import { notifyBookingAccepted } from "@/lib/notify-events";
import { confirmMarketplaceEligibility } from "@/lib/booking-eligibility";
import { apiFailure, privateJson } from "@/lib/api-response";
import { ApiAuthError } from "@/lib/auth";
import { objectIdSchema } from "@/lib/pagination";
import {
  coverageReviewToken,
  destinationIdentity,
} from "@/lib/request-coverage";
import { z } from "zod";
import { commissionForBooking } from "@/lib/finance-commission";
const acceptanceSchema = z
  .object({
    confirmOutOfArea: z.boolean().optional(),
    coverageReviewToken: z
      .string()
      .regex(/^[a-f0-9]{64}$/u)
      .optional(),
  })
  .strict();

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
    const { user, provider } = await requireProvider();
    const { id } = await params;
    objectIdSchema.parse(id);
    const text = await request.text();
    const body = acceptanceSchema.parse(text ? JSON.parse(text) : {});

    const acceptanceSession = await mongoose.startSession();
    let booking;
    try {
      booking = await acceptanceSession.withTransaction(async () => {
        const serviceRequest = await ServiceRequest.findOne({
          _id: id,
          serviceProviderId: provider._id,
          status: "open",
        })
          .select(
            "+address.location +address.locationConfirmation +destinationConfirmation +requestKey",
          )
          .session(acceptanceSession);

        if (!serviceRequest) return null;
        const assessedCoverage = await confirmMarketplaceEligibility(
          provider._id,
          serviceRequest.serviceOfferingId,
          serviceRequest.address,
          acceptanceSession,
        );
        const identity = destinationIdentity(serviceRequest.address);
        if (
          (serviceRequest.destinationConfirmation &&
            serviceRequest.destinationConfirmation.addressIdentity !==
              identity) ||
          (serviceRequest.coverage &&
            serviceRequest.coverage.addressIdentity !== identity) ||
          (serviceRequest.requestKey && !serviceRequest.destinationConfirmation)
        )
          throw new ApiAuthError(
            "The service address changed or needs customer confirmation. Ask the customer to send a new confirmed request.",
            409,
          );
        const needsConfirmation =
          serviceRequest.coverage?.requiresProviderConfirmation === true ||
          assessedCoverage.requiresProviderConfirmation;
        if (
          needsConfirmation &&
          (body.confirmOutOfArea !== true ||
            body.coverageReviewToken !== coverageReviewToken(serviceRequest))
        )
          throw new ApiAuthError(
            "Review this address and explicitly confirm that your team can serve it outside your configured area before accepting.",
            409,
          );
        if (
          body.coverageReviewToken &&
          body.coverageReviewToken !== coverageReviewToken(serviceRequest)
        )
          throw new ApiAuthError(
            "The request address changed. Refresh the request and review it again before accepting.",
            409,
          );
        const coverage = {
          status: serviceRequest.coverage?.status || assessedCoverage.status,
          requiresProviderConfirmation: needsConfirmation,
          assessedAt:
            serviceRequest.coverage?.assessedAt || assessedCoverage.assessedAt,
          addressIdentity: identity,
          acceptanceStatus: assessedCoverage.status,
          ...(needsConfirmation
            ? {
                providerConfirmedBy: user._id,
                providerConfirmedAt: new Date(),
                providerConfirmedAddressIdentity: identity,
              }
            : {}),
        };

        /*
         * Create Booking from the request.
         *
         * Pricing is copied, not recalculated.
         */
        const [booking] = await Booking.create(
          [
            {
              customerId: serviceRequest.customerId,
              commissionSnapshot: await commissionForBooking(provider._id, serviceRequest.serviceOfferingId, acceptanceSession),
              repeatOfBookingId: serviceRequest.repeatOfBookingId,

              serviceProviderId: provider._id,

              serviceOfferingId: serviceRequest.serviceOfferingId,

              serviceType: serviceRequest.serviceName,
              requiredSkillKeys: serviceRequest.requiredSkillKeys || [],

              scheduledAt: serviceRequest.preferredDate,

              address: serviceRequest.address,
              destinationConfirmation: serviceRequest.destinationConfirmation,
              coverage,

              estimatedPrice: serviceRequest.pricing.finalPrice,

              pricing: serviceRequest.pricing,

              status: "confirmed",

              notes: serviceRequest.description || "",

              createdBy: provider.ownerId,
            },
          ],
          { session: acceptanceSession },
        );

        serviceRequest.status = "booked";
        serviceRequest.coverage = coverage;

        await serviceRequest.save({ session: acceptanceSession });
        return booking;
      });
    } finally {
      await acceptanceSession.endSession();
    }
    if (!booking)
      return privateJson(
        { error: "Booking request is no longer available" },
        404,
      );

    //------------------------------------------------------------------------
    // after booking is done , we can send notification to customer
    //-------------------------------------------------------------------------
    const customer = await Customer.findById(booking.customerId).populate(
      "userId",
    );

    const customerUserId = customer?.userId?._id
      ? String(customer.userId._id)
      : null;

    if (customerUserId) {
      await notifyBookingAccepted({
        customerUserId,

        bookingId: booking._id.toString(),

        serviceName: booking.serviceType,

        providerName: provider.companyName,
      });
    }
    //-----------------------------------------------------------------
    //-----------------------------------------------------------------------

    return privateJson({
      success: true,

      booking: {
        id: booking._id,
        status: booking.status,
        customerId: booking.customerId,
        serviceProviderId: booking.serviceProviderId,
        serviceOfferingId: booking.serviceOfferingId,
        pricing: booking.pricing,
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
