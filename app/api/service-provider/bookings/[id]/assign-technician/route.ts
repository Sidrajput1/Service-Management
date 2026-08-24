import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { generateSixDigitOtp } from "@/lib/otp";
import { requireServiceProvider } from "@/lib/service-provider";
import Booking from "@/models/booking";
import Job from "@/models/job";
import Technician from "@/models/technician";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDb();

    const { provider } = await requireServiceProvider(session.user.id);

    const { id } = await params;

    const body = await request.json();

    const technicianId = body.technicianId;

    if (!technicianId) {
      return NextResponse.json(
        {
          error: "Technician is required",
        },
        { status: 400 },
      );
    }

    const booking = await Booking.findOne({
      _id: id,
      serviceProviderId: provider._id,
    });

    if (!booking) {
      return NextResponse.json(
        {
          error: "Booking not found",
        },
        { status: 404 },
      );
    }

    if (!["confirmed", "assigned"].includes(booking.status)) {
      return NextResponse.json(
        {
          error: "This booking cannot be assigned",
        },
        { status: 400 },
      );
    }

    const technician = await Technician.findOne({
      _id: technicianId,
      serviceProviderId: provider._id,
      isActive: true,
      status: {
        //actually allow offline assignment only if the provider intentionally assigns them.
      $nin: [
        "busy",
        "on_leave",
      ],
    },
    });

    if (!technician) {
      return NextResponse.json(
        {
          error: "Technician is not available for this provider",
        },
        { status: 400 },
      );
    }

    /*
     * Prevent two active jobs being assigned
     * to the same technician if you don't want
     * overlapping assignments.
     */
    const activeJob = await Job.findOne({
      technicianId: technician._id,

      status: {
        $in: [
          "scheduled",
          "assigned",
          "enroute",
          "arrived",
          "otp_verified",
          "in_progress",
          "on_hold",
        ],
      },
    });

    if (activeJob) {
      return NextResponse.json(
        {
          error: "Technician already has an active job",
        },
        { status: 409 },
      );
    };

    // implement otp 
    const otp = generateSixDigitOtp();

    const otpExpiresAt = new Date();

    // Keep the OTP valid until the service day ends.
// We can later make this configurable.
otpExpiresAt.setHours(
  23,
  59,
  59,
  999,
);

    /*
     * Create job
     */
    const job = await Job.create({
      bookingId: booking._id,

      serviceProviderId: provider._id,

      technicianId: technician._id,

      assignedBy: provider.ownerId,

      scheduledAt: booking.scheduledAt,

      status: "assigned",

      paymentStatus: "unbilled",

      proofRequired: true,

      otp,
      otpExpiresAt,
    });

    booking.technicianId = technician._id;
    booking.status = "assigned";

    await booking.save();

    /*
     * Technician becomes busy
     */
    technician.status = "busy";

    await technician.save();

    return NextResponse.json({
      success: true,

      job: {
        id: job._id,
        bookingId: job.bookingId,
        technicianId: job.technicianId,
        serviceProviderId: job.serviceProviderId,
        status: job.status,
      },

      booking: {
        id: booking._id,
        status: booking.status,
      },
    });
  } catch (error: any) {
    console.error("Assign technician:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to assign technician",
      },
      { status: 500 },
    );
  }
}
