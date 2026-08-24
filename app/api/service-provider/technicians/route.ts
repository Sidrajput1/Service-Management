import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";

import User from "@/models/user";

import { requireServiceProvider } from "@/lib/service-provider";
import Technician from "@/models/technician";

export const runtime = "nodejs";

/**
 * GET technicians belonging to current provider
 */
// export async function GET() {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     await connectToDb();

//     const { provider } = await requireServiceProvider(session.user.id);

//     let technicians = await Technician.find({
//       serviceProviderId: provider._id,
//     })
//       .populate("userId", "name email phone")
//       .sort({ createdAt: -1 })
//       .lean();

//     // Fallback: sometimes serviceProviderId may be stored as a string in DB
//     // (migration/legacy data). Try matching string form if no results found.
//     if (!technicians || technicians.length === 0) {
//       try {
//         console.warn(
//           `No technicians found for provider ${provider._id}. Trying string-match fallback.`
//         );

//         technicians = await Technician.find({
//           serviceProviderId: String(provider._id),
//         })
//           .populate("userId", "name email phone")
//           .sort({ createdAt: -1 })
//           .lean();

//         console.warn(
//           `Fallback technicians count for provider ${provider._id}: ${technicians.length}`
//         );
//       } catch (e) {
//         console.error("Technician fallback query failed:", e);
//       }
//     }

//     return NextResponse.json({
//       success: true,
//       technicians,
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       {
//         error: error.message || "Unable to load technicians",
//       },
//       { status: 500 },
//     );
//   }
// }

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDb();

    const { provider } =
      await requireServiceProvider(session.user.id);

    console.log(
      "Provider ID:",
      provider._id.toString()
    );

    const technicians = await Technician.find({
      serviceProviderId: provider._id,
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      "Provider technicians:",
      technicians
    );

    return NextResponse.json({
      success: true,
      technicians,
    });
  } catch (error: any) {
    console.error(
      "Provider technicians GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load technicians",
      },
      { status: 500 }
    );
  }
}

/**
 * POST create technician
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDb();

    const { provider } = await requireServiceProvider(session.user.id);

    const body = await request.json();

    const { name, email, phone, skills = [], vehicleType } = body;

    if (!name || !phone) {
      return NextResponse.json(
        {
          error: "Technician name and phone are required",
        },
        { status: 400 },
      );
    }

    const cleanPhone = String(phone).replace(/\D/g, "");

    let user = null;
    let generatedPassword: string | undefined;

    /*
     * If email exists, use existing account.
     * Otherwise create technician account.
     */
    if (email) {
      user = await User.findOne({
        email: String(email).trim().toLowerCase(),
      });
    }

    if (!user) {
      user = await User.findOne({
        phone: cleanPhone,
      });
    }

    /*
     * Existing account
     */
    if (user) {
      if (user.role !== "technician") {
        return NextResponse.json(
          {
            error: "This user account already belongs to another role",
          },
          { status: 409 },
        );
      }
    } else {
      /*
       * New technician account
       *
       * Temporary password is generated.
       * We can replace this later with an invitation flow.
       */
      const temporaryPassword = randomBytes(6).toString("hex");

      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const technicianEmail =
        email?.trim().toLowerCase() || `tech-${cleanPhone}@service.local`;

      user = await User.create({
        name: String(name).trim(),
        email: technicianEmail,
        phone: cleanPhone,
        password: hashedPassword,
        role: "technician",
      });

      /*
       * Return temporary password ONCE.
       *
       * Later we'll replace this with
       * a proper invitation/reset flow.
       */
      generatedPassword = temporaryPassword;
    }

    /*
     * Prevent same user from becoming
     * technician twice.
     */
    const existingTechnician = await Technician.findOne({
      userId: user._id,
    });

    if (existingTechnician) {
      return NextResponse.json(
        {
          error: "This user is already a technician",
        },
        { status: 409 },
      );
    }

    const technician = await Technician.create({
      userId: user._id,
      serviceProviderId: provider._id,
      skills: Array.isArray(skills) ? skills : [],
      vehicleType,
      status: "offline",
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,

        technician: {
          id: technician._id,
          userId: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          skills: technician.skills,
          vehicleType: technician.vehicleType,
        },

        /*
         * Only present when we created
         * a brand-new technician account.
         */
        ...(generatedPassword
          ? {
              temporaryPassword: generatedPassword,
            }
          : {}),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Provider technician create:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to create technician",
      },
      { status: 500 },
    );
  }
}
