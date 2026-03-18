import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/db";
import User from "@/models/user";

export async function POST(request:Request){
    try {
        const session = await getServerSession(authOptions);

        if(!session || !(session.user as any).id){
            return NextResponse.json({error:"unauthorized"},{status:401});
        };

        const body = await request.json();
        const {name,email} = body;

        if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    await connectToDb();

    // Ensure email is not used by another user
    const existing = await User.findOne({ email, _id: { $ne: (session.user as any).id } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      (session.user as any).id,
      { name, email },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err:any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}