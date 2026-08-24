import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireServiceProvider } from "@/lib/service-provider";
import Technician from "@/models/technician";

export const runtime = "nodejs";

// export async function POST() {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { provider } = await requireServiceProvider(session.user.id);

//     const businessProfileComplete = Boolean(
//       provider.companyName &&
//       provider.businessType &&
//       provider.email &&
//       provider.phone,
//     );

//     const addressComplete = Boolean(
//       provider.address?.addressLine &&
//       provider.address?.city &&
//       provider.address?.state &&
//       provider.address?.pincode,
//     );

//     const servicesComplete =
//       Array.isArray(provider.services) && provider.services.length > 0;

//     const areasComplete =
//       Array.isArray(provider.serviceAreas) && provider.serviceAreas.length > 0;

//     const technicianCount = await Technician.countDocuments({
//       serviceProviderId: provider._id,
//       isActive: true,
//     });

//     const techniciansComplete = technicianCount > 0;

//     if (
//       !businessProfileComplete ||
//       !addressComplete ||
//       !servicesComplete ||
//       !areasComplete
//     ) {
//       return NextResponse.json(
//         {
//           error: "Please complete all required onboarding sections",
//         },
//         { status: 400 },
//       );
//     }

//     //   const technicianCount =
//     // await Technician.countDocuments({
//     //   serviceProviderId: provider._id,
//     //   isActive: true,
//     // });

//     if (technicianCount === 0) {
//       return NextResponse.json(
//         {
//           error:
//             "Add at least one active technician before completing onboarding",
//         },
//         { status: 400 },
//       );
//     }

//     provider.onboardingCompletedAt = new Date();

//     await provider.save();

//     return NextResponse.json({
//       success: true,
//       onboardingCompletedAt: provider.onboardingCompletedAt,
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       {
//         error: error.message || "Unable to complete onboarding",
//       },
//       { status: 500 },
//     );
//   }
// }

export async function POST() {
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

    const businessProfileComplete =
      Boolean(
        provider.companyName &&
        provider.businessType &&
        provider.email &&
        provider.phone
      );

    const addressComplete =
      Boolean(
        provider.address?.addressLine &&
        provider.address?.city &&
        provider.address?.state &&
        provider.address?.pincode
      );

    const servicesComplete =
      Array.isArray(provider.services) &&
      provider.services.length > 0;

    const areasComplete =
      Array.isArray(provider.serviceAreas) &&
      provider.serviceAreas.length > 0;

    const technicianCount =
      await Technician.countDocuments({
        serviceProviderId: provider._id,
        isActive: true,
      });

    const techniciansComplete =
      technicianCount > 0;

    if (!businessProfileComplete) {
      return NextResponse.json(
        {
          error:
            "Business profile is incomplete",
        },
        { status: 400 }
      );
    }

    if (!addressComplete) {
      return NextResponse.json(
        {
          error:
            "Business address is incomplete",
        },
        { status: 400 }
      );
    }

    if (!servicesComplete) {
      return NextResponse.json(
        {
          error:
            "Please select at least one service",
        },
        { status: 400 }
      );
    }

    if (!areasComplete) {
      return NextResponse.json(
        {
          error:
            "Please add at least one service area",
        },
        { status: 400 }
      );
    }

    if (!techniciansComplete) {
      return NextResponse.json(
        {
          error:
            "Please add at least one active technician",
        },
        { status: 400 }
      );
    }

    provider.onboardingCompletedAt =
      new Date();

    await provider.save();

    return NextResponse.json({
      success: true,
      onboardingCompletedAt:
        provider.onboardingCompletedAt,
    });
  } catch (error: any) {
    console.error(
      "Complete provider onboarding:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to complete onboarding",
      },
      { status: 500 }
    );
  }
}
