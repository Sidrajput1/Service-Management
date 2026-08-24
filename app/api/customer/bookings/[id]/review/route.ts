import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { connectToDb } from "@/lib/db";

import { requireCustomer } from "@/lib/customer";

import Booking from "@/models/booking";
import Job from "@/models/job";
import Review from "@/models/Review";

import "@/models/customer";
import "@/models/user";
import "@/models/technician";
import "@/models/ServiceProvider";
import { notifyReviewSubmitted } from "@/lib/notify-events";
import ServiceProvider from "@/models/ServiceProvider";
import Technician from "@/models/technician";

const ReviewSchema = z.object({
  providerRating: z.number().int().min(1).max(5),

  technicianRating: z.number().int().min(1).max(5),

  comment: z
    .string()
    .trim()
    .max(1000, "Review cannot exceed 1000 characters")
    .optional()
    .default(""),
});

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    await connectToDb();

    const { customer } = await requireCustomer(session.user.id);

    const { id } = await params;

    const booking = await Booking.findOne({
      _id: id,
      customerId: customer._id,
    }).lean();

    if (!booking) {
      return NextResponse.json(
        {
          error: "Booking not found",
        },
        {
          status: 404,
        },
      );
    }

    const review = await Review.findOne({
      bookingId: booking._id,
      customerId: customer._id,
    }).lean();

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Unable to load review",
      },
      {
        status: error.status || 500,
      },
    );
  }
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    await connectToDb();

    const { customer } = await requireCustomer(session.user.id);

    const { id } = await params;

    const body = await request.json();

    const parsed = ReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues?.[0]?.message || "Invalid review",
        },
        {
          status: 400,
        },
      );
    }

    const booking = await Booking.findOne({
      _id: id,
      customerId: customer._id,
    });

    if (!booking) {
      return NextResponse.json(
        {
          error: "Booking not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Find the Job associated with this booking.
     */
    const job = await Job.findOne({
      bookingId: booking._id,
      // customerId: undefined,
    }).lean();

    /*
     * Job doesn't contain customerId,
     * so booking ownership above is the
     * customer authorization.
     */

    if (!job) {
      return NextResponse.json(
        {
          error: "A completed job is required before leaving a review",
        },
        {
          status: 400,
        },
      );
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        {
          error: "You can review the service only after the job is completed",
        },
        {
          status: 400,
        },
      );
    }

    if (!job.technicianId || !job.serviceProviderId) {
      return NextResponse.json(
        {
          error: "Technician or service provider information is missing",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Prevent duplicate review.
     */
    const existing = await Review.findOne({
      bookingId: booking._id,
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "You have already reviewed this service",
          review: existing,
        },
        {
          status: 409,
        },
      );
    }

    const review = await Review.create({
      customerId: customer._id,

      bookingId: booking._id,

      jobId: job._id,

      serviceProviderId: job.serviceProviderId,

      technicianId: job.technicianId,

      providerRating: parsed.data.providerRating,

      technicianRating: parsed.data.technicianRating,

      comment: parsed.data.comment,

      status: "published",
    });

    const technician =
  await Technician.findById(
    job.technicianId,
  ).lean();

const provider =
  await ServiceProvider.findById(
    job.serviceProviderId,
  )
    .select("ownerId")
    .lean();

await notifyReviewSubmitted({
  providerUserId:
    provider?.ownerId
      ? String(
          provider.ownerId,
        )
      : undefined,

  technicianUserId:
    technician?.userId
      ? String(
          technician.userId,
        )
      : undefined,

  reviewId:
    review._id.toString(),

  bookingId:
    booking._id.toString(),

  jobId:
    job._id.toString(),

  providerRating:
    review.providerRating,

  technicianRating:
    review.technicianRating,
});

    return NextResponse.json(
      {
        success: true,
        review,
      },
      {
        status: 201,
      },
    );
  } catch (error: any) {
    console.error("Create review error:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to submit review",
      },
      {
        status: error.status || 500,
      },
    );
  }
}
