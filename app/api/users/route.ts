import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function GET(request: Request) {

    try {
        await requireRole(["admin","dispatcher"]);

    await connectToDb();

    const url = new URL(request.url);

    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(200, Number(url.searchParams.get("limit") || "20"));
    const q = url.searchParams.get("q") || "";
    const role = url.searchParams.get("role"); // optional filter

    const filter:any = {};

    // 🔍 Search by name/email/phone
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    // 🎯 Filter by role (optional)
    if (role) {
      filter.role = role;
    }

    const total = await User.countDocuments(filter);

    const users =await User.find(filter)
        .select("-password") // exclude password
        .sort({createdAt:-1})
         .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      users,
      total,
      page,
      limit,
    });
    } catch (error:any) {
        return NextResponse.json({
            status: error.status || 500,
            error:error.message || "internal Server Error"
        })
    }
    
}