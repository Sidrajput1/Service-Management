import { authorizeConversation } from "@/lib/chat/authorize-conversation";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema, readPage, pageResult } from "@/lib/pagination";
import { emitConversationMessage, emitConversationUpdate } from "@/lib/socket";
import Conversation from "@/models/chat/Conversation";
import Message from "@/models/chat/Message";

export const runtime = "nodejs";
const schema = z.object({ text: z.string().trim().max(4000).default(""), clientMessageId: z.string().uuid().optional(), attachments: z.array(z.object({ url: z.url().refine(url => url.startsWith("https://")), name: z.string().max(160).optional(), mimeType: z.string().max(100).optional(), size: z.number().min(0).max(8 * 1024 * 1024).optional() })).max(3).default([]) }).refine(value => value.text || value.attachments.length, "A message is required");
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const id = objectIdSchema.parse((await params).id);
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) return privateJson({ error: "Conversation not found" }, 404);
    await authorizeConversation(user, conversation);
    const { cursor, limit } = readPage(request);
    const rows = await Message.find({ conversationId: id, ...(cursor ? { _id: { $lt: cursor } } : {}) }).sort({ _id: -1 }).limit(limit + 1).lean();
    const page = pageResult(rows, limit);
    return privateJson({ conversation, messages: page.items.reverse(), nextCursor: page.nextCursor });
  } catch (error) { return apiFailure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const id = objectIdSchema.parse((await params).id);
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) return privateJson({ error: "Conversation not found" }, 404);
    await authorizeConversation(user, conversation);
    if (conversation.isClosed || conversation.isArchived) return privateJson({ error: "This conversation is closed" }, 409);
    const body = schema.parse(await request.json());
    // Do not accept retryable writes until the partial unique index is ready.
    await Message.init();
    let message;
    try {
      message = await Message.create({ clientMessageId: body.clientMessageId, conversationId: id, senderId: user._id, senderRole: user.role, text: body.text, attachments: body.attachments, messageType: body.attachments.length ? "file" : "text", readBy: [{ userId: user._id, role: user.role, readAt: new Date() }] });
    } catch (error) {
      if (body.clientMessageId && error && typeof error === "object" && "code" in error && error.code === 11000) {
        const existing = await Message.findOne({ clientMessageId: body.clientMessageId, senderId: user._id, conversationId: id }).lean();
        if (existing) return privateJson({ message: existing, duplicate: true });
      }
      throw error;
    }
    await Conversation.updateOne({ _id: id }, { $set: { lastMessageId: message._id, lastMessageText: body.text || "[Attachment]", lastMessageAt: new Date(), lastMessageSenderId: user._id, lastMessageSenderRole: user.role }, $inc: { "participants.$[other].unreadCount": 1 } }, { arrayFilters: [{ "other.userId": { $ne: user._id } }] });
    const payload = message.toObject();
    emitConversationMessage(id, payload);
    emitConversationUpdate(id, { conversationId: id, lastMessageText: body.text, lastMessageAt: new Date() });
    return privateJson({ message: payload }, 201);
  } catch (error) { return apiFailure(error); }
}
