import { requireCurrentUser } from "@/lib/auth";
import { canAccessConversation } from "@/lib/chat/permission";
import { connectToDb } from "@/lib/db";
import { emitConversationUpdate } from "@/lib/socket";
import Conversation from "@/models/chat/Conversation";
import Message from "@/models/chat/Message";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // conversation.participants = conversation.participants.map((p: any) => {
    //   if (String(p.userId) === String(user._id)) {
    //     return {
    //       ...(p.toObject?.() ? p.toObject() : p),
    //       unreadCount: 0,
    //       lastReadAt: new Date(),
    //     };
    //   }
    //   return p.toObject?.() ? p.toObject() : p;
    // });

    conversation.participants = conversation.participants.map((p: any) => {
      const obj = p.toObject ? p.toObject() : p;
      if (String(obj.userId) === String(user._id)) {
        return { ...obj, unreadCount: 0, lastReadAt: new Date() };
      }
      return obj;
    });

    await conversation.save();

    await Message.updateMany(
      {
        conversationId: conversation._id,
        "readBy.userId": { $ne: user._id },
      },
      {
        $push: {
          readBy: {
            userId: user._id,
            role: user.role || "customer",
            readAt: new Date(),
          },
        },
      },
    );

    emitConversationUpdate(String(conversation._id), {
      conversationId: String(conversation._id),
      readByUserId: String(user._id),
      unreadCleared: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to mark conversation as read" },
      { status: 500 },
    );
  }
}
