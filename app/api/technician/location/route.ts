import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";

const LocationSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

export async function POST(request: Request) {
  try {
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const body = await request.json();
    const parsed = LocationSchema.parse(body);

    tech.currentLocation = {
      type: "Point",
      coordinates: [parsed.longitude, parsed.latitude],
      updatedAt: new Date(),
    };

    await tech.save();

    return NextResponse.json({ success: true, technician: tech });
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