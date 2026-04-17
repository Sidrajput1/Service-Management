import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCustomerProfile } from "@/lib/customer";
import { connectToDb } from "@/lib/db";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  addresses: z
    .array(
      z.object({
        label: z.string().optional(),
        addressLine: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDb();
    const { user, customer } = await requireCustomerProfile();
    return NextResponse.json({ user, customer });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDb();
    const { customer } = await requireCustomerProfile();

    const body = await request.json();
    const parsed = UpdateProfileSchema.parse(body);

    if (parsed.name !== undefined) customer.name = parsed.name;
    if (parsed.phone !== undefined) customer.phone = parsed.phone;
    if (parsed.email !== undefined) customer.email = parsed.email;
    if (parsed.addresses !== undefined) customer.addresses = parsed.addresses as any;
    if (parsed.notes !== undefined) customer.notes = parsed.notes;

    await customer.save();

    return NextResponse.json({ customer });
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