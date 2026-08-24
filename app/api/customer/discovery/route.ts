import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireCustomer } from "@/lib/customer";

import ServiceOffering from "@/models/ServiceOffering";
import { Technician } from "@/models";
import PriceItem from "@/models/PriceItem";
import mongoose, { Mongoose } from "mongoose";
import Review from "@/models/Review";

export const runtime = "nodejs";

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadius = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;

  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

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

function calculatePrice(offering: any, offerActive: boolean) {
  const basePrice = Number(offering.price) || 0;

  if (!offerActive) {
    return {
      basePrice,
      discountAmount: 0,
      finalPrice: basePrice,
    };
  }

  const discountValue = Number(offering.discountValue || 0);

  let discountAmount = 0;

  if (offering.discountType === "percentage") {
    discountAmount = (basePrice * discountValue) / 100;
  }

  if (offering.discountType === "flat") {
    discountAmount = discountValue;
  }

  discountAmount = Math.min(discountAmount, basePrice);

  return {
    basePrice,
    discountAmount,
    finalPrice: basePrice - discountAmount,
  };
}

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     await connectToDb();

//     const { customer } = await requireCustomer(session.user.id);

//     const url = new URL(request.url);

//     const serviceId = url.searchParams.get("serviceId");

//     const city = url.searchParams.get("city");

//     const pincode = url.searchParams.get("pincode");

//     const latitude = Number(url.searchParams.get("latitude"));

//     const longitude = Number(url.searchParams.get("longitude"));

//     if (!serviceId) {
//       return NextResponse.json(
//         {
//           error: "serviceId is required",
//         },
//         { status: 400 },
//       );
//     }

//     const offerings = await ServiceOffering.find({
//       priceItemId: serviceId,

//       isActive: true,
//     })
//       .populate(
//         "serviceProviderId",
//         "companyName businessType description email phone address serviceAreas verificationStatus status",
//       )
//       .populate("priceItemId", "name itemType price taxPercent description")
//       .lean();

//     const activeOfferings = offerings.filter((offering: any) => {
//       const provider = offering.serviceProviderId;

//       if (!provider) {
//         return false;
//       }

//       return (
//         provider.status === "active" &&
//         provider.verificationStatus === "verified"
//       );
//     });

//     /*
//      * Optional location filtering.
//      *
//      * For now we match city/pincode against
//      * provider address and serviceAreas.
//      */
//     const locationFiltered = activeOfferings.filter((offering: any) => {
//       const provider = offering.serviceProviderId;

//       if (!city && !pincode) {
//         return true;
//       }

//       const normalizedCity = city?.trim().toLowerCase();

//       const normalizedPincode = pincode?.trim().toLowerCase();

//       const providerCity = provider.address?.city?.toLowerCase();

//       const providerPincode = provider.address?.pincode?.toLowerCase();

//       const serviceAreas = Array.isArray(provider.serviceAreas)
//         ? provider.serviceAreas
//         : [];

//       const areaMatch = serviceAreas.some((area: string) => {
//         const normalized = area.toLowerCase();

//         return (
//           (normalizedCity && normalized.includes(normalizedCity)) ||
//           (normalizedPincode && normalized.includes(normalizedPincode))
//         );
//       });

//       return (
//         (normalizedCity && providerCity === normalizedCity) ||
//         (normalizedPincode && providerPincode === normalizedPincode) ||
//         areaMatch
//       );
//     });

//     const providerIds = locationFiltered.map(
//       (offering: any) => offering.serviceProviderId._id,
//     );

//     const availableTechnicians = await Technician.aggregate([
//       {
//         $match: {
//           serviceProviderId: {
//             $in: providerIds,
//           },

//           isActive: true,

//           status: "available",
//         },
//       },

//       {
//         $group: {
//           _id: "$serviceProviderId",

//           count: {
//             $sum: 1,
//           },
//         },
//       },
//     ]);

//     const availabilityMap = new Map(
//       availableTechnicians.map((item: any) => [String(item._id), item.count]),
//     );

//     const hasCustomerLocation =
//       Number.isFinite(latitude) &&
//       Number.isFinite(longitude) &&
//       latitude !== 0 &&
//       longitude !== 0;

//     const providers = locationFiltered.map((offering: any) => {
//       const provider = offering.serviceProviderId;

//       const offerActive = isOfferActive(offering);

//       const pricing = calculatePrice(offering, offerActive);

//       let distanceKm: number | null = null;

//       const providerCoordinates = provider.address?.location?.coordinates;

//       if (
//         hasCustomerLocation &&
//         Array.isArray(providerCoordinates) &&
//         providerCoordinates.length === 2
//       ) {
//         const [providerLng, providerLat] = providerCoordinates;

//         distanceKm = calculateDistanceKm(
//           latitude,
//           longitude,
//           providerLat,
//           providerLng,
//         );
//       }

//       return {
//         offeringId: offering._id,

//         provider: {
//           id: provider._id,
//           companyName: provider.companyName,

//           businessType: provider.businessType,

//           description: provider.description,

//           verificationStatus: provider.verificationStatus,

//           address: provider.address,

//           serviceAreas: provider.serviceAreas,
//         },

//         service: {
//           id: offering.priceItemId?._id,

//           name: offering.name,

//           description: offering.description,

//           taxPercent: offering.taxPercent,
//         },

//         pricing: {
//           ...pricing,

//           offerActive,

//           offerName: offerActive ? offering.offerName : null,

//           discountType: offerActive ? offering.discountType : null,

//           discountValue: offerActive ? offering.discountValue : 0,

//           offerStartsAt: offerActive ? offering.offerStartsAt : null,

//           offerEndsAt: offerActive ? offering.offerEndsAt : null,
//         },

//         availability: {
//           availableTechnicians: availabilityMap.get(String(provider._id)) || 0,

//           available: Boolean(availabilityMap.get(String(provider._id))),
//         },

//         distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(1)) : null,
//       };
//     });

//     /*
//      * Sort:
//      * 1. Available providers
//      * 2. Offers
//      * 3. Nearest providers
//      */
//     providers.sort((a: any, b: any) => {
//       if (a.availability.available !== b.availability.available) {
//         return a.availability.available ? -1 : 1;
//       }

//       if (a.pricing.offerActive !== b.pricing.offerActive) {
//         return a.pricing.offerActive ? -1 : 1;
//       }

//       if (a.distanceKm !== null && b.distanceKm !== null) {
//         return a.distanceKm - b.distanceKm;
//       }

//       return a.pricing.finalPrice - b.pricing.finalPrice;
//     });

//     return NextResponse.json({
//       success: true,
//       providers,
//       count: providers.length,
//     });
//   } catch (error: any) {
//     console.error("Customer discovery error:", error);

//     return NextResponse.json(
//       {
//         error: error.message || "Unable to find service providers",
//       },
//       { status: 500 },
//     );
//   }
// }


export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDb();

    const { customer } = await requireCustomer(session.user.id);

    const url = new URL(request.url);

    const serviceId = url.searchParams.get("serviceId");
    const city = url.searchParams.get("city");
    const pincode = url.searchParams.get("pincode");
    const latitude = Number(url.searchParams.get("latitude"));
    const longitude = Number(url.searchParams.get("longitude"));

    if (!serviceId) {
      return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
    }

    // Fetch offerings and populate provider + price item
    const offerings = await ServiceOffering.find({
      priceItemId: serviceId,
      isActive: true,
    })
      .populate(
        "serviceProviderId",
        "companyName businessType description email phone address serviceAreas verificationStatus status",
      )
      .populate("priceItemId", "name itemType price taxPercent description")
      .lean();

    // Filter only active + verified providers
    const activeOfferings = offerings.filter((offering: any) => {
      const provider = offering.serviceProviderId;
      if (!provider) return false;
      return provider.status === "active" && provider.verificationStatus === "verified";
    });

    // Optional location filtering (city / pincode / serviceAreas)
    const locationFiltered = activeOfferings.filter((offering: any) => {
      const provider = offering.serviceProviderId;
      if (!city && !pincode) return true;

      const normalizedCity = city?.trim().toLowerCase();
      const normalizedPincode = pincode?.trim().toLowerCase();
      const providerCity = provider.address?.city?.toLowerCase();
      const providerPincode = provider.address?.pincode?.toLowerCase();

      const serviceAreas = Array.isArray(provider.serviceAreas) ? provider.serviceAreas : [];
      const areaMatch = serviceAreas.some((area: string) => {
        const normalized = area.toLowerCase();
        return (normalizedCity && normalized.includes(normalizedCity)) ||
               (normalizedPincode && normalized.includes(normalizedPincode));
      });

      return (
        (normalizedCity && providerCity === normalizedCity) ||
        (normalizedPincode && providerPincode === normalizedPincode) ||
        areaMatch
      );
    });

    // Collect provider IDs for batched rating lookup
    const providerIds = locationFiltered
      .map((offering: any) => offering.serviceProviderId?._id)
      .filter(Boolean);

    // Batched aggregation to compute averageRating and reviewCount for all providers
    let ratingMap = new Map<string, { averageRating: number; reviewCount: number }>();

    if (providerIds.length > 0) {
      const ratings = await Review.aggregate([
        {
          $match: {
            serviceProviderId: { $in: providerIds.map((id: any) => new mongoose.Types.ObjectId(String(id))) },
            status: "published",
          },
        },
        {
          $group: {
            _id: "$serviceProviderId",
            averageRating: { $avg: "$providerRating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]);

      ratingMap = new Map(
        ratings.map((item: any) => [
          String(item._id),
          {
            averageRating: Math.round(Number(item.averageRating || 0) * 10) / 10,
            reviewCount: Number(item.reviewCount || 0),
          },
        ]),
      );
    }

    // Get available technicians counts per provider
    const availableTechnicians = await Technician.aggregate([
      {
        $match: {
          serviceProviderId: { $in: providerIds },
          isActive: true,
          status: "available",
        },
      },
      {
        $group: {
          _id: "$serviceProviderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const availabilityMap = new Map(
      availableTechnicians.map((item: any) => [String(item._id), item.count]),
    );

    const hasCustomerLocation =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude !== 0 &&
      longitude !== 0;

    // Build final providers array and enrich with rating + reviewCount
    const providers = locationFiltered.map((offering: any) => {
      const provider = offering.serviceProviderId;
      const offerActive = isOfferActive(offering);
      const pricing = calculatePrice(offering, offerActive);

      let distanceKm: number | null = null;
      const providerCoordinates = provider.address?.location?.coordinates;

      if (
        hasCustomerLocation &&
        Array.isArray(providerCoordinates) &&
        providerCoordinates.length === 2
      ) {
        const [providerLng, providerLat] = providerCoordinates;
        distanceKm = calculateDistanceKm(latitude, longitude, providerLat, providerLng);
      }

      const ratingEntry = ratingMap.get(String(provider._id));

      return {
        offeringId: offering._id,
        provider: {
          id: provider._id,
          companyName: provider.companyName,
          businessType: provider.businessType,
          description: provider.description,
          verificationStatus: provider.verificationStatus,
          address: provider.address,
          serviceAreas: provider.serviceAreas,
        },
        service: {
          id: offering.priceItemId?._id,
          name: offering.name,
          description: offering.description,
          taxPercent: offering.taxPercent,
        },
        pricing: {
          ...pricing,
          offerActive,
          offerName: offerActive ? offering.offerName : null,
          discountType: offerActive ? offering.discountType : null,
          discountValue: offerActive ? offering.discountValue : 0,
          offerStartsAt: offerActive ? offering.offerStartsAt : null,
          offerEndsAt: offerActive ? offering.offerEndsAt : null,
        },
        availability: {
          availableTechnicians: availabilityMap.get(String(provider._id)) || 0,
          available: Boolean(availabilityMap.get(String(provider._id))),
        },
        distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(1)) : null,
        // Enriched rating fields from batched lookup
        rating: ratingEntry?.averageRating || 0,
        reviewCount: ratingEntry?.reviewCount || 0,
      };
    });

    // Sorting: available -> offers -> nearest -> price
    providers.sort((a: any, b: any) => {
      if (a.availability.available !== b.availability.available) {
        return a.availability.available ? -1 : 1;
      }
      if (a.pricing.offerActive !== b.pricing.offerActive) {
        return a.pricing.offerActive ? -1 : 1;
      }
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return a.pricing.finalPrice - b.pricing.finalPrice;
    });

    return NextResponse.json({
      success: true,
      providers,
      count: providers.length,
    });
  } catch (error: any) {
    console.error("Customer discovery error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to find service providers" },
      { status: 500 },
    );
  }
}
