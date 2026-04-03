import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import { NextResponse } from "next/server";

export async function GET(req:Request) {
    try {
        await requireRole(["admin","dispatcher"]);

        await connectToDb();

        const url = new URL(req.url);
        const page = Math.max(1,Number(url.searchParams.get("page") || 1));
        const limit = Math.min(100,Number(url.searchParams.get("limit") || 20));

        const status = url.searchParams.get("status") || "";

        const q = url.searchParams.get("q") || "";

    const filter: any = {};
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { invoiceNumber: { $regex: q, $options: "i" } },
      ];
    }

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate("jobId")
      .populate("bookingId")
      .populate("customerId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ invoices, total, page, limit });


    } catch (err:any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
    }
}