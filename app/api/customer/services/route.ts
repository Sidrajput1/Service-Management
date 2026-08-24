import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireCustomer } from "@/lib/customer";

import PriceItem from "@/models/PriceItem";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await requireCustomer(
      session.user.id
    );

    await connectToDb();

    const services =
      await PriceItem.find({
        itemType: "service",
        isActive: true,
      })
        .select(
          "_id name price taxPercent description"
        )
        .sort({
          name: 1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error: any) {
    console.error(
      "Customer services error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load services",
      },
      { status: 500 }
    );
  }
}

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json(
//         {
//           error: "Unauthorized",
//         },
//         {
//           status: 401,
//         },
//       );
//     }

//     await connectToDb();

//     await requireCustomer(session.user.id);

//     const url = new URL(request.url);

//     const search = url.searchParams.get("search")?.trim();

//     if (!search) {
//       return NextResponse.json({
//         success: true,
//         services: [],
//         message:"No find any service"
//       });
//     }

//     const services = await PriceItem.find({
//       itemType: "service",

//       isActive: true,

//       // name: {
//       //   $regex: search,
//       //   $options: "i",
//       // },
//     } as any)
//       .select("_id name description price taxPercent itemType")
//       .sort({
//         name: 1,
//       })
//       .limit(20)
//       .lean();

//     return NextResponse.json({
//       success: true,
//       services,
//     });
//   } catch (error: any) {
//     console.error("Customer services lookup error:", error);

//     return NextResponse.json(
//       {
//         error: error.message || "Unable to find services",
//       },
//       {
//         status: error.status || 500,
//       },
//     );
//   }
// }
