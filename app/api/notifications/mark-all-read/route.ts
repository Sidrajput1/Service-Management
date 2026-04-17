import { requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Notification from "@/models/notification";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(){
    try {
        await connectToDb();

        const user = await requireCurrentUser();

        await Notification.updateMany(
            {
                $or:[
                    {recipientUserId:user._id},
                    {recipientRole:user.role}
                ],
                status:"unread",
            },
            {
        $set: {
          status: "read",
          readAt: new Date(),
        },
      }
        );

         return NextResponse.json({ success: true });
    } catch (err:any) {
         return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
    }
}