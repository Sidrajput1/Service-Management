import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";


// import Customer from "@/models/customer";
// import ServiceOffering from "@/models/ServiceOffering";
import { Customer, ServiceRequest, ServiceOffering } from "@/models";
import Booking from "@/models/booking";
import Technician from "@/models/technician";
import Job from "@/models/job";


export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
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

    const { id } = await params;

    const booking = await Booking.findOne({
      _id: id,
      serviceProviderId: provider._id,
    })
      .populate(
        "customerId",
        "name phone email addresses notes"
      )
      .populate(
        "serviceOfferingId",
        "name price taxPercent description offerEnabled offerName discountType discountValue"
      )
      .lean();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    };

    const job = await Job.findOne({
  bookingId: booking._id,
  serviceProviderId: provider._id,
  // optional: if booking has technicianId and you want to ensure match
  ...(booking.technicianId ? { technicianId: booking.technicianId } : {}),
})
  .select("_id status scheduledAt paymentStatus") // only fetch small set
  .lean();

    const technicians = await Technician.find({
      serviceProviderId: provider._id,
      isActive: true,
    })
      .populate(
        "userId",
        "name phone email"
      )
      .sort({
        status: 1,
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,

      booking,
      job,

      technicians,
    });
  } catch (error: any) {
    console.error(
      "Provider booking detail error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load booking",
      },
      { status: 500 }
    );
  }
}

// export async function GET(request: Request) {
//   try {
//     const session =
//       await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json(
//         { error: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     await connectToDb();

//     const { provider } =
//       await requireServiceProvider(
//         session.user.id
//       );

//     const { searchParams } =
//       new URL(request.url);

//     const status =
//       searchParams.get("status");

//     const query: Record<string, any> = {
//       serviceProviderId: provider._id,
//     };

//     if (
//       status &&
//       status !== "all"
//     ) {
//       query.status = status;
//     }

//     const bookings =
//       await Booking.find(query)
//         .populate(
//           "customerId",
//           "name phone email"
//         )
//         .populate(
//           "serviceOfferingId",
//           "name price offerEnabled offerName discountType discountValue"
//         )
//         .populate(
//           "technicianId",
//           "status isActive userId"
//         )
//         .sort({
//           createdAt: -1,
//         })
//         .lean();

//     return NextResponse.json({
//       success: true,
//       bookings,
//     });
//   } catch (error: any) {
//     console.error(
//       "Provider bookings GET:",
//       error
//     );

//     return NextResponse.json(
//       {
//         error:
//           error.message ||
//           "Unable to load bookings",
//       },
//       { status: 500 }
//     );
//   }
// }