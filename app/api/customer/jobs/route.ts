import { requireCustomerProfile } from "@/lib/customer";
import { connectToDb } from "@/lib/db";
import Booking from "@/models/booking";
import Job from "@/models/job";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(){
    try {
        await connectToDb();

        const {customer} = await requireCustomerProfile();

        const booking = await Booking.find({customerId:customer._id})
                    .sort({createdAt:-1})
                    .lean();
        
        const bookingIds = booking.map((b:any) => b._id);

        const jobs = await Job.find({bookingId:{$in:bookingIds}})
                .populate({
                    path:"bookingId",
                    populate:{path:"customerId"},
                })
                .populate({
                    path:"technicianId",
                    populate:{path:"userId"}
                })
                .populate("invoiceId")
                .sort({createdAt:-1})
                .lean()
        
            return NextResponse.json({jobs});
    } catch (error:any) {
         return NextResponse.json({
            error:error.message || "Server error",
        },{status:error.status || 500})
    }
}