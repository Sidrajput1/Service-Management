import { requireProvider } from "@/lib/service-provider";
import { onboardingProgress } from "@/lib/provider-onboarding";
import { apiFailure, privateJson } from "@/lib/api-response";
import { saveProviderProfile } from "@/lib/provider-review";
export const runtime = "nodejs";
export async function POST() {
  try {
    const { provider } = await requireProvider();
    const progress = await onboardingProgress(provider);
    const missing = Object.entries(progress)
      .filter(([, done]) => !done)
      .map(
        ([key]) =>
          ({
            businessProfile: "business details",
            address: "business address",
            services: "a priced service offering",
            serviceAreas: "an active service area",
            team: "an active Pro",
          })[key],
      );
    if (missing.length)
      return privateJson(
        {
          error: `Complete ${missing.join(", ")} before finishing onboarding.`,
        },
        400,
      );
    if (!provider.onboardingCompletedAt) {
      const now = new Date();
      await saveProviderProfile(
        provider,
        { onboardingCompletedAt: now, reviewSubmittedAt: now },
        false,
      );
      provider.onboardingCompletedAt = now;
    }
    return privateJson({
      success: true,
      onboardingCompletedAt: provider.onboardingCompletedAt,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
