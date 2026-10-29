import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCustomerProfile } from "@/lib/customer";
import { connectToDb } from "@/lib/db";
import { apiFailure, privateJson } from "@/lib/api-response";
import { normalizePincode } from "@/lib/marketplace-policy.mjs";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d ()-]*$/)
    .optional(),
  email: z
    .union([z.string().trim().email().max(254), z.literal("")])
    .optional(),
  addresses: z
    .array(
      z.object({
        label: z.string().trim().max(50).optional(),
        addressLine: z.string().trim().min(3).max(300),
        city: z.string().trim().min(2).max(100),
        state: z.string().trim().max(100).optional(),
        locality: z.string().trim().max(100).optional(),
        pincode: z
          .string()
          .transform(normalizePincode)
          .pipe(z.string().regex(/^[1-9]\d{5}$/)),
      }),
    )
    .max(10)
    .optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDb();
    const { user, customer } = await requireCustomerProfile();
    return privateJson({ user, customer });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 },
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
    if (parsed.addresses !== undefined) customer.addresses = parsed.addresses;
    if (parsed.notes !== undefined) customer.notes = parsed.notes;

    await customer.save();

    return privateJson({ customer });
  } catch (error) {
    return apiFailure(error);
  }
}
