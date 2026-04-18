import { requireCurrentUser } from "@/lib/auth";
import { buildParticipantKey } from "@/lib/chat/permission";
import { connectToDb } from "@/lib/db";
import Conversation from "@/models/chat/Conversation";
import Job from "@/models/job";
import { NextResponse } from "next/server";
import "@/models/job";
import "@/models/customer";
import "@/models/technician";

export const runtime = "nodejs";

export async function POST(request:Request){
    try {
        await connectToDb();
    const user = await requireCurrentUser();

    const body = await request.json();
    const type = body.type as "job" | "support" | "direct";
    const jobId = body.jobId as string | undefined;
    const subject = body.subject as string | undefined;

    if (type === "job") {
      if (!jobId) {
        return NextResponse.json({ error: "jobId is required" }, { status: 400 });
      }

      const job = await Job.findById(jobId)
        .populate({
          path: "bookingId",
          populate: { path: "customerId" },
        })
        .populate("technicianId");

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const customerUserId = (job.bookingId as any)?.customerId?.userId;
      const technicianUserId = (job.technicianId as any)?.userId;

      if (!customerUserId || !technicianUserId) {
        return NextResponse.json(
          {
            error:
              "Customer or technician userId is missing. Link User accounts to Customer and Technician records first.",
          },
          { status: 400 }
        );
      }

      const participantKey = buildParticipantKey(String(job._id));

      const existing = await Conversation.findOne({ participantKey });
      if (existing) {
        return NextResponse.json({ conversation: existing }, { status: 200 });
      }

      const conversation = await Conversation.create({
        type: "job",
        jobId: job._id,
        bookingId: job.bookingId?._id || null,
        subject: subject || (job.bookingId as any)?.serviceType || "Job chat",
        participantKey,
        participants: [
          {
            userId: customerUserId,
            role: "customer",
            joinedAt: new Date(),
            lastReadAt: null,
            unreadCount: 0,
          },
          {
            userId: technicianUserId,
            role: "technician",
            joinedAt: new Date(),
            lastReadAt: null,
            unreadCount: 0,
          },
        ],
        createdByUserId: user._id,
        createdByRole: user.role,
      });

      return NextResponse.json({ conversation }, { status: 201 });
    }

    if (type === "support") {
      const conversation = await Conversation.create({
        type: "support",
        subject: subject || "Support",
        participants: [
          {
            userId: user._id,
            role: user.role || "customer",
            joinedAt: new Date(),
            lastReadAt: new Date(),
            unreadCount: 0,
          },
        ],
        createdByUserId: user._id,
        createdByRole: user.role,
      });

      return NextResponse.json({ conversation }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported conversation type" }, { status: 400 });
    } catch (error:any) {
        return NextResponse.json({
            error:error.message || "failed to ensure conversation"
        },{status:500})
    }
}