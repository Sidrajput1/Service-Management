import { requireCurrentUser, ApiAuthError } from "@/lib/auth";
import { isPrivilegedRole, normalizeParticipants } from "@/lib/chat/permission";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult, objectIdSchema } from "@/lib/pagination";
import Conversation from "@/models/chat/Conversation";
import User from "@/models/user";
import { z } from "zod";
import mongoose, { type PipelineStage } from "mongoose";
import Job from "@/models/job";
import Booking from "@/models/booking";
import Customer from "@/models/customer";
import Technician from "@/models/technician";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { cursor, limit } = readPage(request);
    const type = new URL(request.url).searchParams.get("type");
    const filter: Record<string, unknown> = isPrivilegedRole(user.role) ? {} : { "participants.userId": user._id };
    if (type && ["job", "support", "direct"].includes(type)) filter.type = type;
    if (cursor) filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    const stages: PipelineStage[] = [{ $match: filter }];
    if (!isPrivilegedRole(user.role)) {
      stages.push({ $lookup: { from: Job.collection.name, localField: "jobId", foreignField: "_id", as: "authorizedJob", pipeline: [
        { $lookup: { from: Booking.collection.name, localField: "bookingId", foreignField: "_id", as: "booking" } },
        { $unwind: "$booking" },
        { $lookup: { from: Customer.collection.name, localField: "booking.customerId", foreignField: "_id", as: "customer" } },
        { $lookup: { from: Technician.collection.name, localField: "technicianId", foreignField: "_id", as: "pro" } },
        { $match: user.role === "customer" ? { "customer.userId": user._id } : user.role === "technician" ? { "pro.userId": user._id } : { _id: null } },
        { $project: { _id: 1 } },
      ] } }, { $match: { $or: [{ type: { $ne: "job" } }, { "authorizedJob.0": { $exists: true } }] } });
    }
    stages.push({ $sort: { _id: -1 } }, { $limit: limit + 1 }, { $project: { type: 1, subject: 1, jobId: 1, bookingId: 1, lastMessageText: 1, lastMessageAt: 1, participants: 1, isClosed: 1 } });
    const rows = await Conversation.aggregate(stages);
    const page = pageResult(rows, limit);
    return privateJson({ conversation: page.items, nextCursor: page.nextCursor });
  } catch (error) { return apiFailure(error); }
}
const createSchema = z.object({ type: z.literal("direct"), subject: z.string().trim().max(160).optional(), participants: z.array(z.object({ userId: objectIdSchema })).min(1).max(10) });
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    // Job/support chats must use the ownership-checked ensure route.
    if (!isPrivilegedRole(user.role)) throw new ApiAuthError("Use a conversation associated with your job", 403);
    const body = createSchema.parse(await request.json());
    const users = await User.find({ _id: { $in: body.participants.map(p => p.userId) }, isActive: { $ne: false }, role: { $in: ["admin", "dispatcher", "customer", "technician"] } }).select("_id role").lean();
    if (users.length !== new Set(body.participants.map(p => p.userId)).size) return privateJson({ error: "Invalid participants" }, 400);
    const participants = normalizeParticipants(users.map(p => ({ userId: String(p._id), role: p.role })), user);
    const participantKey = `direct:${participants.map(p => p.userId).sort().join(":")}`;
    const conversation = await Conversation.findOneAndUpdate({ participantKey }, { $setOnInsert: { type: "direct", subject: body.subject, participants, createdByUserId: user._id, createdByRole: user.role } }, { upsert: true, new: true, runValidators: true });
    return privateJson({ conversation });
  } catch (error) { return apiFailure(error); }
}
