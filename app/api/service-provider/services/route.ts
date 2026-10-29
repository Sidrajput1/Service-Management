import { saveProviderProfile } from "@/lib/provider-review";
import mongoose from "mongoose";
import { z } from "zod";
import { requireProvider } from "@/lib/service-provider";
import { readCatalog } from "@/lib/catalog/server";
import { saveProviderOffering } from "@/lib/provider-offerings";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import { offeringSchema } from "@/lib/marketplace-validation";
import PriceItem from "@/models/PriceItem";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { provider } = await requireProvider();
    return privateJson({
      success: true,
      ...(await readCatalog()),
      selectedServiceIds: provider.services.map(String),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { provider } = await requireProvider();
    const body = await request.json();
    if (body.offerings !== undefined) {
      const selected = z
        .array(offeringSchema)
        .min(1)
        .max(100)
        .parse(body.offerings);
      if (
        new Set(selected.map((value) => value.priceItemId)).size !==
        selected.length
      )
        return privateJson({ error: "Select each service only once" }, 400);
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const value of selected)
            await saveProviderOffering(provider._id, value, {
              session,
              onboarding: true,
            });
        });
      } finally {
        await session.endSession();
      }
    } else {
      // Legacy clients can save catalog selection, but this never enables an offering or invents a price.
      const ids = z
        .array(objectIdSchema)
        .min(1)
        .max(100)
        .parse(body.serviceIds);
      if (
        new Set(ids).size !== ids.length ||
        (await PriceItem.countDocuments({
          _id: { $in: ids },
          isActive: true,
          itemType: "service",
        })) !== ids.length
      )
        return privateJson(
          { error: "Select distinct active catalog services" },
          400,
        );
      await saveProviderProfile(
        provider,
        { services: ids.map((id) => new mongoose.Types.ObjectId(id)) },
        false,
      );
    }
    return privateJson({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
