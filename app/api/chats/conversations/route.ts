import { requireCurrentUser } from "@/lib/auth";
import { buildParticipantKey, isPrivilegedRole, normalizeParticipants } from "@/lib/chat/permission";
import { connectToDb } from "@/lib/db";
import Conversation from "@/models/chat/Conversation";
import { NextResponse } from "next/server";


export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        await connectToDb();
        const user = await requireCurrentUser();

        const url = new URL(request.url);
        const type = url.searchParams.get("type") || undefined;
       // const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
       // const skip = Number(url.searchParams.get("skip") || "0");

        const filter : any = {};
        if (type) filter.type = type;

    if (!isPrivilegedRole(user.role)) {
      filter["participants.userId"] = user._id;
    }


        const conversation = await Conversation.find(filter)
            .sort({lastMessageAt:-1 , updatedAt:-1})
            // .skip(skip)
            // .limit(limit)
            .lean();

        return NextResponse.json({ conversation });
        
    } catch (error:any) {
         return NextResponse.json(
      { error: error.message || "Failed to load conversations" },
      { status: 500 }
    );
    }
};

export async function POST(request: Request) {
  try {
    await connectToDb();
    const user = await requireCurrentUser();

    const body = await request.json();

    const type = body.type || "direct";
    const jobId = body.jobId || undefined;
    const bookingId = body.bookingId || undefined;
    const subject = body.subject || null;

    const participants = normalizeParticipants(body.participants || [], user);
    //const participantKey = buildParticipantKey(type, jobId, participants);

    const participantKey = buildParticipantKey(type);

    const existing = await Conversation.findOne({ participantKey });
    if (existing) {
      return NextResponse.json({ conversation: existing }, { status: 200 });
    }

    const conversation = await Conversation.create({
      type,
      jobId,
      bookingId,
      subject,
      participantKey,
      participants,
      createdByUserId: user._id,
      createdByRole: user.role,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create conversation" },
      { status: 500 }
    );
  }
}