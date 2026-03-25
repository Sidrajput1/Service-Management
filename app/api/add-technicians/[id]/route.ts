import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Technician from "@/models/technician";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { z } from "zod";



const UpdateTechnicianSchema = z.object({
  skills: z.array(z.string()).optional(),
  vehicleType: z.string().optional().nullable(),
  status: z.enum(["offline", "available", "busy", "on_leave"]).optional(),
  rating: z.coerce.number().optional(),
  jobsCompleted: z.coerce.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const technician = await Technician.findById(params.id).populate("userId");
    if (!technician) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    return NextResponse.json({ technician });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin"]);
    await connectToDb();

    const body = await request.json();
    const parsed = UpdateTechnicianSchema.parse(body);

    const technician = await Technician.findByIdAndUpdate(params.id, parsed, {
      new: true,
    }).populate("userId");

    if (!technician) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    return NextResponse.json({ technician });
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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin"]);
    await connectToDb();

    const technician = await Technician.findById(params.id);
    if (!technician) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    const user = await User.findById(technician.userId);
    if (user) {
      user.role = "customer";
      await user.save();
    }

    await Technician.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}