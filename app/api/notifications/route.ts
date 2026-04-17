import { requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Notification from "@/models/notification";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET(request:Request){
    try {
        await connectToDb();
        const user = await requireCurrentUser();

        const url = new URL(request.url);
        const limit = Math.min(100,Number(url.searchParams.get("limit") || "20"));
        const unreadOnly = url.searchParams.get("unreadOnly") === "true";

       const filter: any = {
      $or: [
        { recipientUserId: user._id },
        { recipientRole: user.role },
      ],
    };

    if (unreadOnly) {
      filter.status = "unread";
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      ...filter,
      status: "unread",
    });

    return NextResponse.json({ notifications, unreadCount });
    } catch (err:any) {
        return NextResponse.json({
            error:err.message || "Server error",

        },{status:err.status || 500})
    };
};


// notification creation

export async function POST(request:Request){
    try {
        await connectToDb();
        await requireCurrentUser();

        const body = await request.json();

        const notif = await Notification.create({
            ...body,
            status:"unread",
            channel:body.channel || "in_app",
        });

        return NextResponse.json({

            notif
        },{status:201});
    } catch (err:any) {
        return NextResponse.json({
            error:err.message || "Server error",

        },{status:err.status || 500})
    }
}