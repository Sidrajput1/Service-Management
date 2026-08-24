import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireServiceProvider } from "@/lib/service-provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { provider } = await requireServiceProvider(
      session.user.id
    );

    const hasBusinessProfile =
      Boolean(
        provider.companyName &&
        provider.businessType &&
        provider.email &&
        provider.phone
      );

    const hasAddress =
      Boolean(
        provider.address?.addressLine &&
        provider.address?.city &&
        provider.address?.state &&
        provider.address?.pincode
      );

    const hasServices =
      Array.isArray(provider.services) &&
      provider.services.length > 0;

    const hasServiceAreas =
      Array.isArray(provider.serviceAreas) &&
      provider.serviceAreas.length > 0;

    const onboardingComplete =
      Boolean(provider.onboardingCompletedAt) ||
      (
        hasBusinessProfile &&
        hasAddress &&
        hasServices &&
        hasServiceAreas
      );

    return NextResponse.json({
      success: true,

      onboardingComplete,

      provider: {
        id: provider._id,
        companyName: provider.companyName,
        businessType: provider.businessType,
        email: provider.email,
        phone: provider.phone,
        address: provider.address,
        services: provider.services,
        serviceAreas: provider.serviceAreas,
        verificationStatus: provider.verificationStatus,
        trialStartedAt: provider.trialStartedAt,
        trialEndsAt: provider.trialEndsAt,
      },

      progress: {
        businessProfile: hasBusinessProfile,
        address: hasAddress,
        services: hasServices,
        serviceAreas: hasServiceAreas,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load provider onboarding",
      },
      { status: 500 }
    );
  }
};

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { provider } =
      await requireServiceProvider(session.user.id);

    const body = await request.json();

    const {
      companyName,
      businessType,
      description,
      email,
      phone,
      address,
      serviceAreas,
      services,
    } = body;

    if (companyName !== undefined) {
      provider.companyName = companyName;
    }

    if (businessType !== undefined) {
      provider.businessType = businessType;
    }

    if (description !== undefined) {
      provider.description = description;
    }

    if (email !== undefined) {
      provider.email = email;
    }

    if (phone !== undefined) {
      provider.phone = phone;
    }

    if (address !== undefined) {
      provider.address = {
        ...provider.address,
        ...address,
      };
    }

    // Ensure address.location exists and has the correct GeoJSON structure
    const addressData = provider.address ?? {};
    provider.address = addressData;

    if (!addressData.location || !Array.isArray(addressData.location?.coordinates)) {
      addressData.location = {
        type: "Point",
        coordinates: [0, 0],
      } as any;
    } else {
      // Ensure coordinates array length is 2
      const coords = addressData.location.coordinates || [0, 0];
      if (!Array.isArray(coords) || coords.length < 2) {
        addressData.location.coordinates = [0, 0];
      }
    }

    if (Array.isArray(serviceAreas)) {
      provider.serviceAreas = serviceAreas;
    }

    if (Array.isArray(services)) {
      provider.services = services;
    }

    await provider.save();

    return NextResponse.json({
      success: true,
      provider,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to update provider onboarding",
      },
      { status: 500 }
    );
  }
}