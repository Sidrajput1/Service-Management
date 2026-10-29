import { authorizeConversation } from "@/lib/chat/authorize-conversation";
import { requireCurrentUser } from "@/lib/auth";
import { emitConversationUpdate } from "@/lib/socket";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import Conversation from "@/models/chat/Conversation";
import Message from "@/models/chat/Message";

export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const id = objectIdSchema.parse((await params).id);
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) return privateJson({ error: "Conversation not found" }, 404);
    await authorizeConversation(user, conversation);
    const readAt = new Date();
    await Message.updateMany({ conversationId: conversation._id, createdAt: { $lte: readAt }, "readBy.userId": { $ne: user._id } }, {
      $push: { readBy: { userId: user._id, role: user.role, readAt } },
    });
    await Conversation.updateOne({ _id: conversation._id, "participants.userId": user._id, $or: [{ lastMessageAt: { $lte: readAt } }, { lastMessageAt: null }] }, {
      $set: { "participants.$.unreadCount": 0, "participants.$.lastReadAt": readAt },
    });
    emitConversationUpdate(id, { conversationId: id, readByUserId: String(user._id), unreadCleared: true });
    return privateJson({ ok: true });
  } catch (error) { return apiFailure(error); }
}
