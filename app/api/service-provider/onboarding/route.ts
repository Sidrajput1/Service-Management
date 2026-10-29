import { saveProviderProfile } from "@/lib/provider-review";
import { providerProfileSchema } from "@/lib/provider-profile-input";
import { requireProvider } from "@/lib/service-provider";
import { onboardingProgress } from "@/lib/provider-onboarding";
import { apiFailure, privateJson } from "@/lib/api-response";

import { legacyCoverage } from "@/lib/marketplace-policy.mjs";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { provider } = await requireProvider();
    const progress = await onboardingProgress(provider);
    return privateJson({
      success: true,
      onboardingComplete: Boolean(provider.onboardingCompletedAt),
      progress,
      provider: {
        id: provider._id,
        companyName: provider.companyName,
        businessType: provider.businessType,
        description: provider.description,
        email: provider.email,
        phone: provider.phone,
        address: provider.address,
        businessImage: provider.businessImage,
        services: provider.services,
        coverageAreas: legacyCoverage(provider),
        serviceAreas: provider.serviceAreas,
        verificationStatus: provider.verificationStatus,
        reviewVersion: provider.reviewVersion || 0,
        reviewSubmittedAt: provider.reviewSubmittedAt,
        lastReview: provider.lastReview,
        status: provider.status,
        onboardingCompletedAt: provider.onboardingCompletedAt,
        trialStartedAt: provider.trialStartedAt,
        trialEndsAt: provider.trialEndsAt,
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { provider } = await requireProvider();
    const value = providerProfileSchema.parse(await request.json());
    await saveProviderProfile(provider, {
      companyName: value.companyName,
      businessType: value.businessType,
      description: value.description || "",
      email: value.email,
      phone: value.phone,
      address: { ...provider.address, ...value.address },
    });
    return privateJson({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
