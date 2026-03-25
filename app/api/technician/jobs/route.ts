import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import { requireTechnicianProfile } from "@/lib/technician";
import Customer from "@/models/customer";
import Job from "@/models/job";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const jobs = await Job.find({ technicianId: tech._id })
      .populate({
        path: "bookingId",
        populate: {
          path: "customerId",
          model: Customer,
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}