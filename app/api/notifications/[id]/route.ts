import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Notification from "@/models/notification";


export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> } ) {
  try {
    await connectToDb();
    const user = await requireCurrentUser();
    const body = await request.json();

    const {id} = await params;
    const notif = await Notification.findById(id);
    if (!notif) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const ownerMatch =
      String(notif.recipientUserId || "") === String(user._id) ||
      notif.recipientRole === user.role;

    if (!ownerMatch) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.status === "read") {
      notif.status = "read";
      notif.readAt = new Date();
    }

    await notif.save();

    return NextResponse.json({ notif });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> } ) {
  try {
    await connectToDb();
    const {id} = await params;
    const user = await requireCurrentUser();

    const notif = await Notification.findById(id);
    if (!notif) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const ownerMatch =
      String(notif.recipientUserId || "") === String(user._id) ||
      notif.recipientRole === user.role;

    if (!ownerMatch) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Notification.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}