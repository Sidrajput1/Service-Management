import { publishedOfferingFilter } from "@/lib/moderation-policy.mjs";
import "server-only";
import mongoose from "mongoose";

import { connectToDb } from "@/lib/db";
import { calculateOfferingPrice } from "@/lib/service-offering-price";
import { isOfferCurrentlyActive } from "@/lib/service-offering-offer";
import ServiceOffering from "@/models/ServiceOffering";
import ServiceProvider from "@/models/ServiceProvider";
import PriceItem from "@/models/PriceItem";
import type { PublicService, PublicCatalog } from "@/lib/public-service-types";
import { eligibleProvider, providerCoverageFilter } from "@/lib/discovery";
import { catalogCategories } from "@/lib/catalog/definition.mjs";

interface CatalogRow {
  _id: { toString(): string };
  name: string;
  description?: string;
  price: number;
  pricingModel?: "fixed" | "starting" | "per_unit" | "quote_required";
  unit?: string;
  taxPercent: number;
  offerEnabled?: boolean;
  offerStartsAt?: Date;
  offerEndsAt?: Date;
  discountType?: "percentage" | "flat";
  discountValue?: number;
  service: { _id: { toString(): string }; name: string; description?: string };
  provider: { companyName: string; serviceAreas?: string[] };
  offerName?: string;
}

/** Public projection only: no customer details, provider contacts, or addresses. */
export async function getPublicServices(
  serviceId?: string,
): Promise<PublicCatalog> {
  try {
    await connectToDb();
    const rows = await ServiceOffering.aggregate<CatalogRow>([
      {
        $match: {
          ...publishedOfferingFilter,
          pricingModel: { $ne: "quote_required" },
          ...(serviceId
            ? { priceItemId: new mongoose.Types.ObjectId(serviceId) }
            : {}),
        },
      },
      {
        $lookup: {
          from: ServiceProvider.collection.name,
          localField: "serviceProviderId",
          foreignField: "_id",
          as: "provider",
          pipeline: [
            { $match: { ...eligibleProvider, ...providerCoverageFilter({}) } },
            { $project: { _id: 1, companyName: 1, serviceAreas: 1 } },
          ],
        },
      },
      { $unwind: "$provider" },
      {
        $lookup: {
          from: PriceItem.collection.name,
          localField: "priceItemId",
          foreignField: "_id",
          as: "service",
          pipeline: [
            {
              $match: {
                isActive: true,
                itemType: "service",
                categoryKey: {
                  $in: [
                    ...catalogCategories
                      .filter((category) => category.isActive)
                      .map((category) => category.key),
                    "other",
                    null,
                    "",
                  ],
                },
              },
            },
            { $project: { name: 1, description: 1 } },
          ],
        },
      },
      { $unwind: "$service" },
      {
        $project: {
          service: 1,
          provider: 1,
          pricingModel: 1,
          unit: 1,
          name: 1,
          description: 1,
          price: 1,
          taxPercent: 1,
          offerName: 1,
          offerEnabled: 1,
          offerStartsAt: 1,
          offerEndsAt: 1,
          discountType: 1,
          discountValue: 1,
        },
      },
    ]);

    const services = new Map<string, PublicService>();
    const now = new Date();
    for (const row of rows) {
      const id = String(row.service._id);
      const activeOffer = isOfferCurrentlyActive(row, now);
      const { finalPrice } = calculateOfferingPrice(
        row.price,
        activeOffer ? row.discountType : undefined,
        activeOffer ? row.discountValue : 0,
      );
      const current = services.get(id);
      if (!current || finalPrice < current.price) {
        services.set(id, {
          id,
          name: String(row.service.name),
          description: String(row.service.description || row.description || ""),
          offeringId: String(row._id),
          price: finalPrice,
          taxPercent: Number(row.taxPercent || 0),
          ...(serviceId ? { offerings: current?.offerings || [] } : {}),
        });
      }
      if (serviceId)
        services.get(id)?.offerings?.push({
          id: String(row._id),
          name: row.name,
          pricingModel: row.pricingModel || "fixed",
          unit: row.unit || "job",
          description: row.description || "",
          providerName: row.provider.companyName,
          serviceAreas: row.provider.serviceAreas || [],
          price: finalPrice,
          taxPercent: Number(row.taxPercent || 0),
          ...(activeOffer && row.offerName ? { offerName: row.offerName } : {}),
        });
    }
    return {
      status: "ready",
      services: [...services.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    };
  } catch {
    // Keep configuration/connection details out of the public response.
    console.error("Public service catalog could not be loaded.");
    return { status: "error", services: [] };
  }
}
