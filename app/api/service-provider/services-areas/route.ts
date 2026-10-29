import { requireProvider } from "@/lib/service-provider";
import { apiFailure, privateJson } from "@/lib/api-response";
import { areasSchema } from "@/lib/marketplace-validation";
import { legacyCoverage } from "@/lib/marketplace-policy.mjs";
import { saveProviderProfile } from "@/lib/provider-review";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { provider } = await requireProvider();
    return privateJson({
      success: true,
      areas: legacyCoverage(provider),
      legacy: provider.coverageVersion !== 1,
      serviceAreas: provider.serviceAreas,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { provider } = await requireProvider();
    const body = await request.json();
    const areas = areasSchema.parse(body.areas);
    // The canonical collection replaces future coverage, never booking address snapshots.
    provider.coverageAreas = areas;
    provider.coverageVersion = 1;
    provider.serviceAreas = areas
      .filter((area) => area.isActive)
      .map((area) =>
        [area.city, area.locality, area.pincode].filter(Boolean).join(" · "),
      );
    await saveProviderProfile(
      provider,
      {
        coverageAreas: provider.coverageAreas,
        coverageVersion: 1,
        serviceAreas: provider.serviceAreas,
      },
      false,
    );
    return privateJson({
      success: true,
      areas: provider.coverageAreas,
      serviceAreas: provider.serviceAreas,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
