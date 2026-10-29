import Job from "@/models/job";
import { connectToDb } from "@/lib/db";
import Conversation from "@/models/chat/Conversation";
import "@/models/customer";
import "@/models/booking";
import "@/models/technician";

/** Trusted server-side creation. HTTP callers must authorize the job first. */
export async function ensureJobConversation(jobId: string, createdBy?: { _id: unknown; role?: string }) {
  await connectToDb();
  const job = await Job.findById(jobId).populate({ path: "bookingId", populate: { path: "customerId", select: "userId" } }).populate("technicianId", "userId");
  if (!job) throw new Error("Job not found");
  const booking = job.bookingId as unknown as { _id: unknown; customerId?: { userId?: unknown }; serviceType?: string };
  const pro = job.technicianId as unknown as { userId?: unknown };
  if (!booking.customerId?.userId || !pro?.userId) throw new Error("A customer and assigned Pro account are required for chat");
  const expected = [{ userId: String(booking.customerId.userId), role: "customer" as const }, { userId: String(pro.userId), role: "technician" as const }];
  const participantKey = `job:${job._id}`;
  const conversation = await Conversation.findOneAndUpdate({ participantKey }, { $setOnInsert: { type: "job", jobId: job._id, bookingId: booking._id, subject: booking.serviceType || "Service conversation", participants: expected, createdByUserId: createdBy?._id || null, createdByRole: createdBy?.role || null } }, { upsert: true, new: true, runValidators: true });
  const same = conversation.participants.length === expected.length && expected.every(person => conversation.participants.some(p => String(p.userId) === person.userId && p.role === person.role));
  if (!same) {
    conversation.set("participants", expected.map(person => {
      const prior = conversation.participants.find(p => String(p.userId) === person.userId);
      return { ...person, joinedAt: prior?.joinedAt || new Date(), lastReadAt: prior?.lastReadAt || null, unreadCount: prior?.unreadCount || 0 };
    }));
    await conversation.save();
  }
  return conversation;
}
