import { requireCurrentUser, ApiAuthError } from "@/lib/auth";
import { canAccessConversation, isPrivilegedRole } from "@/lib/chat/permission";
import { ensureJobConversation } from "@/lib/chat/ensure-job-conversation";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import Job from "@/models/job";
import Conversation from "@/models/chat/Conversation";
import "@/models/customer";
import "@/models/booking";
import "@/models/technician";
import { z } from "zod";

export const runtime = "nodejs";
const schema = z.object({ type: z.enum(["job", "support"]), jobId: objectIdSchema.optional(), subject: z.string().trim().max(160).optional() });
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = schema.parse(await request.json());
    if (body.type === "support") {
      const key = `support:${user._id}`;
      const conversation = await Conversation.findOneAndUpdate({ participantKey: key }, { $setOnInsert: {
        type: "support", subject: body.subject || "Service support", participants: [{ userId: user._id, role: user.role, unreadCount: 0 }], createdByUserId: user._id, createdByRole: user.role,
      } }, { new: true, upsert: true, runValidators: true });
      return privateJson({ conversation });
    }
    const jobId = objectIdSchema.parse(body.jobId);
    const job = await Job.findById(jobId).populate({ path: "bookingId", populate: { path: "customerId", select: "userId" } }).populate("technicianId", "userId");
    if (!job) return privateJson({ error: "Job not found" }, 404);
    const booking = job.bookingId as unknown as { customerId?: { userId?: unknown } };
    const technician = job.technicianId as unknown as { userId?: unknown } | null;
    if (!isPrivilegedRole(user.role) && ![booking.customerId?.userId, technician?.userId].some(id => id && String(id) === String(user._id))) throw new ApiAuthError("Conversation access denied", 403);
    const conversation = await ensureJobConversation(jobId, user);
    if (!canAccessConversation(user, conversation)) throw new ApiAuthError("Conversation access denied", 403);
    return privateJson({ conversation });
  } catch (error) { return apiFailure(error); }
}
