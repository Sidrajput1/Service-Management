import Job from "@/models/job";
import { connectToDb } from "../db";
import Conversation from "@/models/chat/Conversation";
import '@/models/customer';
import '@/models/booking';
import '@/models/technician';

export async function  ensureJobConversation(jobId: string, createdBy?: { _id: any; role?: string }) {

    await connectToDb();

    const job = await Job.findById(jobId)
            .populate({
                path:"bookingId",
                populate:{path:"customerId"}
            })
            .populate("technicianId");

     if (!job) {
    throw new Error("Job not found");
  }

  const participantKey = `job:${job._id}`;

  const existing = await Conversation.findOne({ participantKey });
  if (existing) return existing;

  const customerUserId = (job.bookingId as any)?.customerId?.userId;
  const technicianUserId = (job.technicianId as any)?.userId;

//   if (!customerUserId || !technicianUserId) {
//     throw new Error("Customer or technician userId missing for job chat");
//   }

  if (!customerUserId) {
  throw new Error("Customer userId missing. Link Customer with User first.");
}

if (!technicianUserId) {
  throw new Error("Technician userId missing. Link Technician with User first.");
}

  return await Conversation.create({
    type: "job",
    jobId: job._id,
    bookingId: job.bookingId?._id || null,
    subject: (job.bookingId as any)?.serviceType || "Job chat",
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
    createdByUserId: createdBy?._id || null,
    createdByRole: createdBy?.role || null,
  });

}