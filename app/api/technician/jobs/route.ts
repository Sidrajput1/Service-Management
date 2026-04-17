import { requireCurrentUser, requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import { requireTechnicianProfile } from "@/lib/technician";
import Customer from "@/models/customer";
import Job from "@/models/job";
import { NextResponse } from "next/server";
import Booking from "@/models/booking";
import Conversation from "@/models/chat/Conversation";



export async function GET() {
  try {
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();

    const user = await requireCurrentUser();

    const jobs = await Job.find({ technicianId: tech._id })
      .populate({
        path: "bookingId",
        model: Booking,
        populate: {
          path: "customerId",
          model: Customer,
        },
      })
      .sort({ createdAt: -1 })
      .lean();
    
    const conversations = await Conversation.find({
      jobId:{$in:jobs.map((j) => j._id)},
    }).lean();

    const convMap = new Map(
      conversations.map((c) => [String(c.jobId),c])
    );

    const enrichedJobs = jobs.map((job) => {
      const conv = convMap.get(String(job._id));

      return {
        ...job,
        conversationsId:conv?._id || null,
        chatUnreadCount:
          conv?.participants?.find(
          (p: any) => String(p.userId) === String(user._id)
        )?.unreadCount || 0,
      }
    })

    return NextResponse.json({ jobs:enrichedJobs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}