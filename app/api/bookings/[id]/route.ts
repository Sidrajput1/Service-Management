// app/api/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { apiFailure } from "@/lib/api-response";
import { z } from "zod";

import { requireRole } from "@/lib/auth";

import { connectToDb } from "@/lib/db";
import Booking from "@/models/booking";
import { cancelBooking, notifyCancellation } from "@/lib/booking-cancellation";
import { requestIdSchema } from "@/lib/finance-validation";
import { assertFinanceWrite } from "@/lib/finance-security";
import Job from "@/models/job";

const BookingUpdateSchema = z.object({
  cancellationReason: z.string().optional(),
  cancellationNote: z.string().trim().max(1000).optional(),
  requestId: requestIdSchema.optional(),
  serviceType: z.string().optional(),
  subService: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  estimatedPrice: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["pending", "confirmed", "assigned", "cancelled", "rescheduled"]).optional(),
  address: z
    .object({
      addressLine: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      pincode: z.string().optional().nullable(),
    })
    .optional(),
});

export async function GET(_: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();
    const {id} = await params;

    const booking = await Booking.findById(id)
      .populate("customerId")
      .populate("leadId")
      .lean();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function PUT(request: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    const {user} = await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const {id} = await params;
    const body = await request.json();
    const parsed = BookingUpdateSchema.parse(body);
    if (parsed.status === "cancelled") {
      assertFinanceWrite(request);
      const cancellation = z.object({reason:z.string().min(1),requestId:requestIdSchema}).parse({reason:parsed.cancellationReason,requestId:parsed.requestId});
      const result = await cancelBooking(user,id,{...cancellation,note:parsed.cancellationNote});
      await notifyCancellation(id,cancellation.requestId);
      return NextResponse.json(result);
    }
    const current = await Booking.findById(id);
    if (!current) return NextResponse.json({error:"Booking not found"},{status:404});
    if (current.status === "cancelled" || await Job.exists({bookingId:current._id,status:{$in:["enroute","arrived","otp_verified","in_progress","on_hold","completed"]}})) return NextResponse.json({error:"This booking is locked by its job history. Use the review process for changes."},{status:409});
    const changes = {...parsed}; delete changes.cancellationReason; delete changes.cancellationNote; delete changes.requestId;

    const booking = await Booking.findByIdAndUpdate(
      id,
      {
        ...changes,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
      },
      { new: true }
    );

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function DELETE() {
  try { await requireRole(["admin"]); return NextResponse.json({error:"Booking history is retained. Cancel the booking with a reason instead."},{status:409}); }
  catch (error) { return apiFailure(error); }
}
