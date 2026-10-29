import { requireProvider } from "@/lib/service-provider";
import { saveProviderOffering } from "@/lib/provider-offerings";
import { apiFailure, privateJson } from "@/lib/api-response";
import ServiceOffering from "@/models/ServiceOffering";
import "@/models/PriceItem";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { provider } = await requireProvider();
    const offerings = await ServiceOffering.find({
      serviceProviderId: provider._id,
    })
      .populate(
        "priceItemId",
        "name catalogKey categoryKey skillKeys unit suggestedPrice isActive taxPercent",
      )
      .sort({ _id: -1 })
      .lean();
    return privateJson({ success: true, offerings });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { provider } = await requireProvider();
    return privateJson(
      {
        success: true,
        offering: await saveProviderOffering(
          provider._id,
          await request.json(),
        ),
      },
      201,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return privateJson(
        { error: "This service is already configured. Refresh and edit it." },
        409,
      );
    return apiFailure(error);
  }
}
