import { requireCustomerProfile } from "@/lib/customer";
import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(){
    try {
        await connectToDb();

        const {customer} = await requireCustomerProfile();

        const invoices = await Invoice.find({customerId:customer._id})
                .populate("jobId")
                .populate("bookingId")
                .sort({createdAt:-1})
                .lean();

        return NextResponse.json({invoices});
    } catch (err:any) {
        { error: err.message || "Server error" }
      { status: err.status || 500 }
    }
}