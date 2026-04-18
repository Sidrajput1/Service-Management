import { requireCurrentUser } from "@/lib/auth";
import { canAccessConversation, isPrivilegedRole } from "@/lib/chat/permission";
import { connectToDb } from "@/lib/db";
import { emitConversationMessage, emitConversationUpdate } from "@/lib/socket";
import Conversation from "@/models/chat/Conversation";
import Message from "@/models/chat/Message";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDb();
    const user = await requireCurrentUser();

    const { id } = await params;
     console.log("CHAT GET messages id:", id);

     if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
    }

     const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (!canAccessConversation(user, conversation)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      //.limit(limit)
      .lean();

    return NextResponse.json({ conversation, messages });

  } catch (error: any) {
     console.error("CHAT GET failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDb();
    const user = await requireCurrentUser();

    const { id } = await params;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (!canAccessConversation(user, conversation)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const text = String(body.text || "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!text && attachments.length === 0) {
      return NextResponse.json(
        { error: "Message text or attachment is required" },
        { status: 400 },
      );
    }

    const sendRole = user.role || "customer";

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: user._id,
      senderRole: sendRole,
      text,
      attachments,
      messageType: attachments.length ? "file" : "text",
      readBy: [
        {
          userId: user._id,
          role: sendRole,
          readAt: new Date(),
        },
      ],
      metadata: body.metadata || {},
    });

    // const participantIds = new Set(
    //   (conversation.participants || []).map((p: any) => String(p.userId)),
    // );

    // if (!participantIds.has(String(user._id))) {
    //   if (isPrivilegedRole(user.role)) {
    //     conversation.participants.push({
    //       userId: user._id,
    //       role: sendRole,
    //       joinedAt: new Date(),
    //       lastReadAt: new Date(),
    //       unreadCount: 0,
    //     } as any);
    //   } else {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    //   }
    // }

    // conversation.participants = conversation.participants.map((p: any) => {
    //   if (String(p.userId) === String(user._id)) {
    //     return {
    //       ...(p.toObject?.() ? p.toObject() : p),
    //       lastReadAt: new Date(),
    //       unreadCount: 0,
    //     };
    //   }

    //   return {
    //     ...(p.toObject?.() ? p.toObject() : p),
    //     unreadCount: (p.unreadCount || 0) + 1,
    //   };
    // });

    // conversation.lastMessageId = message._id as any;
    // conversation.lastMessageText = text || "[Attachment]";
    // conversation.lastMessageSenderId = user._id as any;
    // conversation.lastMessageSenderRole = sendRole;
    // conversation.lastMessageAt = new Date();

    conversation.lastMessageId = message._id as any;
    conversation.lastMessageText = text || "[Attachment]";
    conversation.lastMessageSenderId = user._id as any;
    conversation.lastMessageSenderRole = sendRole;
    conversation.lastMessageAt = new Date();

    conversation.participants = conversation.participants.map((p:any) => {
      const obj = p.toObject ? p.toObject() : p;
      if(String(obj.userId) === String(user._id)){
        return {...obj , lastReadAt:new Date(), unreadcount:0};
      }
      return {...obj , unreadCount : (obj.unreadCount || 0) + 1};
    });

    if (!conversation.participants.some((p: any) => String(p.userId) === String(user._id))) {
      if (isPrivilegedRole(user.role)) {
        conversation.participants.push({
          userId: user._id,
          role: sendRole,
          joinedAt: new Date(),
          lastReadAt: new Date(),
          unreadCount: 0,
        } as any);
      }
    }


    await conversation.save();

    const messageObject = message.toObject?.() || message;

    const payload = {
      _id: message._id,
      conversationId: String(message.conversationId),
      senderId: String(message.senderId),
      senderRole: message.senderRole,
      text: message.text,
      attachments: message.attachments,
      messageType: message.messageType,
      readBy: message.readBy,
      //createdAt: message.createdAt,
      //updatedAt: message.updatedAt,
      metadata: message.metadata,
    };

    emitConversationMessage(String(conversation._id), payload);
    emitConversationUpdate(String(conversation._id), {
      conversationId: String(conversation._id),
      lastMessageText: conversation.lastMessageText,
      lastMessageAt: conversation.lastMessageAt,
      // lastMessageSenderId: String(user._id),
      // lastMessageSenderRole: sendRole,
    });

    return NextResponse.json({ message: payload }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 },
    );
  }
}
