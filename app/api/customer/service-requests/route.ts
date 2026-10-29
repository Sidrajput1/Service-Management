import { captureServiceDestination } from "@/lib/confirmed-address";
import { destinationCaptureSchema } from "@/lib/location-validation";
import { offeringEligibility } from "@/lib/moderation-policy.mjs";
import { normalizePincode } from "@/lib/marketplace-policy.mjs";
import {
  coverageForRequest,
  destinationIdentity,
  requestIntentHash,
} from "@/lib/request-coverage";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { connectToDb } from "@/lib/db";

import ServiceRequest from "@/models/ServiceRequest";
import ServiceOffering from "@/models/ServiceOffering";
import Booking from "@/models/booking";
import Job from "@/models/job";
import "@/models/PriceItem";
import type { Types } from "mongoose";
import type { IServiceProvider } from "@/models/ServiceProvider";
import { catalogCategories } from "@/lib/catalog/definition.mjs";
import { calculateOfferingPrice } from "@/lib/service-offering-price";
import { isOfferCurrentlyActive } from "@/lib/service-offering-offer";

export const runtime = "nodejs";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema, readPage, pageResult } from "@/lib/pagination";
import { requireCustomerProfile } from "@/lib/customer";
import { z } from "zod";
const requestSchema = z.object({
  requestKey: z.string().uuid(),
  destinationConfirmed: z.literal(true),
  serviceOfferingId: objectIdSchema,
  repeatOfBookingId: objectIdSchema.optional(),
  destinationCapture: destinationCaptureSchema.optional(),
  quantity: z.number().int().min(1).max(1000).default(1),
  address: z.object({
    addressLine: z.string().trim().min(3).max(300),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().max(100).optional(),
    locality: z.string().trim().max(100).optional(),
    pincode: z
      .string()
      .transform(normalizePincode)
      .pipe(z.string().regex(/^[1-9]\d{5}$/)),
  }),
  preferredDate: z
    .string()
    .refine(
      (value) =>
        Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now(),
      "Choose a future time",
    )
    .optional(),
  description: z.string().trim().max(2000).optional(),
});
function requestResponse(
  serviceRequest: {
    _id: unknown;
    status: string;
    serviceName: string;
    pricing: unknown;
    coverage?: { status: string; requiresProviderConfirmation: boolean };
  },
  replay = false,
) {
  return privateJson(
    {
      success: true,
      replay,
      serviceRequest: {
        id: serviceRequest._id,
        status: serviceRequest.status,
        serviceName: serviceRequest.serviceName,
        pricing: serviceRequest.pricing,
        coverage: serviceRequest.coverage
          ? {
              status: serviceRequest.coverage.status,
              requiresProviderConfirmation:
                serviceRequest.coverage.requiresProviderConfirmation,
            }
          : undefined,
      },
    },
    replay ? 200 : 201,
  );
}
export async function GET(request: Request) {
  try {
    const { customer } = await requireCustomerProfile();
    const { cursor, limit } = readPage(request);
    const rows = await ServiceRequest.find({
      customerId: customer._id,
      status: { $ne: "booked" },
      ...(cursor ? { _id: { $lt: cursor } } : {}),
    })
      .select(
        "serviceName status preferredDate pricing address serviceProviderId coverage.status coverage.requiresProviderConfirmation declineReason declinedAt createdAt",
      )
      .populate("serviceProviderId", "companyName")
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();
    const page = pageResult(rows, limit);
    return privateJson({ requests: page.items, nextCursor: page.nextCursor });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDb();

    const { customer } = await requireCustomerProfile();

    const body = requestSchema.parse(await request.json());
    const intentHash = requestIntentHash(body);
    const existingRequest = await ServiceRequest.findOne({
      customerId: customer._id,
      requestKey: body.requestKey,
    }).select("+requestHash");
    if (existingRequest) {
      if (existingRequest.requestHash !== intentHash)
        return privateJson(
          {
            error:
              "This request reference was already used for different details. Review the address and send a new request.",
          },
          409,
        );
      return requestResponse(existingRequest, true);
    }

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
      .populate<{
        serviceProviderId: IServiceProvider | null;
      }>(
        "serviceProviderId",
        "companyName status verificationStatus onboardingCompletedAt coverageVersion coverageAreas serviceAreas address.city address.state",
      )
      .populate<{
        priceItemId: {
          _id: Types.ObjectId;
          itemType: string;
          isActive: boolean;
          categoryKey?: string;
          skillKeys?: string[];
        } | null;
      }>("priceItemId", "itemType isActive categoryKey skillKeys")
      .lean();

    if (!offering) {
      return NextResponse.json(
        {
          error: "Service offering not found",
        },
        { status: 404 },
      );
    }

    const provider = offering.serviceProviderId;
    if (body.repeatOfBookingId) {
      const previous = await Booking.findOne({_id:body.repeatOfBookingId,customerId:customer._id,serviceOfferingId:offering._id,serviceProviderId:provider?._id}).select("_id").lean();
      if (!previous || !await Job.exists({bookingId:previous._id,serviceProviderId:provider?._id,status:"completed"})) return privateJson({error:"Choose a completed booking from your account to book this provider again."},404);
    }

    const eligibilityError = offeringEligibility(
      offering,
      provider,
      offering.priceItemId,
      address,
      catalogCategories
        .filter((category) => category.isActive)
        .map((category) => category.key),
    );
    if (eligibilityError || !provider || !offering.priceItemId)
      return privateJson({ error: eligibilityError }, 400);
    if (offering.pricingModel === "quote_required")
      return privateJson(
        {
          error:
            "This service requires a quotation and cannot be booked as a fixed-price service online.",
        },
        409,
      );
    const quantity = offering.pricingModel === "per_unit" ? body.quantity : 1;
    if (offering.price * quantity > 1000000)
      return privateJson(
        { error: "The quantity exceeds the online booking limit." },
        400,
      );
    const offerActive = isOfferCurrentlyActive(offering);
    const pricing = {
      ...calculateOfferingPrice(
        offering.price * quantity,
        offerActive ? offering.discountType : undefined,
        offerActive
          ? offering.discountType === "flat"
            ? (offering.discountValue || 0) * quantity
            : offering.discountValue
          : 0,
      ),
      quantity,
      unit: offering.unit || "job",
      pricingModel: offering.pricingModel || "fixed",
      taxPercent: offering.taxPercent ?? 18,
      discountType: offerActive ? offering.discountType : undefined,
      discountValue: offerActive ? offering.discountValue : 0,
      offerName: offerActive ? offering.offerName : undefined,
    };

    const confirmedAddress = captureServiceDestination(
      address,
      body.destinationCapture,
      session.user.id,
    );
    const coverage = coverageForRequest(provider, confirmedAddress);
    let serviceRequest;
    try {
      serviceRequest = await ServiceRequest.create({
        requestKey: body.requestKey,
        repeatOfBookingId: body.repeatOfBookingId,
        requestHash: intentHash,
        destinationConfirmation: {
          confirmedBy: session.user.id,
          confirmedAt: new Date(),
          addressIdentity: destinationIdentity(confirmedAddress),
        },
        coverage,
        customerId: customer._id,

        serviceProviderId: provider._id,

        serviceOfferingId: offering._id,

        priceItemId: offering.priceItemId._id,

        serviceName: offering.name,
        requiredSkillKeys: offering.priceItemId.skillKeys || [],

        description: description || "",

        address: confirmedAddress,

        preferredDate: preferredDate ? new Date(preferredDate) : undefined,

        pricing,

        status: "open",
      });
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 11000
        )
      )
        throw error;
      const replay = await ServiceRequest.findOne({
        customerId: customer._id,
        requestKey: body.requestKey,
      }).select("+requestHash");
      if (!replay || replay.requestHash !== intentHash)
        return privateJson(
          {
            error:
              "This request reference was already used for different details. Review and send a new request.",
          },
          409,
        );
      return requestResponse(replay, true);
    }
    return requestResponse(serviceRequest);
  } catch (error) {
    return apiFailure(error);
  }
}
