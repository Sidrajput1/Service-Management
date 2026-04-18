// app/api/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";

import { connectToDb } from "@/lib/db";
import Booking from "@/models/booking";

const BookingUpdateSchema = z.object({
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
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const {id} = await params;
    const body = await request.json();
    const parsed = BookingUpdateSchema.parse(body);

    const booking = await Booking.findByIdAndUpdate(
      id,
      {
        ...parsed,
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

export async function DELETE(request: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    await connectToDb();
     const {id} = await params;

    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}