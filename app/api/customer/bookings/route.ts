import { requireCustomerProfile } from "@/lib/customer";
import { connectToDb } from "@/lib/db";
import Booking from "@/models/booking";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import { NextResponse } from "next/server";
import "@/models/technician";
import "@/models/user";
export const runtime = 'nodejs';

export async function GET() {

    try {
        await connectToDb();

        const {customer} = await requireCustomerProfile();

        console.log("Customer from booking",customer);

        const booking = await Booking.find({customerId:customer._id})
                .sort({createdAt:-1})
                .lean();
        
        console.log(booking);
        const bookingIds = booking.map((b:any) => b._id);
        const jobs = await Job.find({bookingId:{$in:bookingIds}})
                .populate({
                    path:"technicianId",
                    populate:{path:"userId"}
                })
                .lean();
        const invoices = await Invoice.find({customerId:customer._id}).lean();

        const jobMap = new Map<string,any>();

        jobs.forEach((job:any) => {
            jobMap.set(String(job.bookingId),job)
        });

        const invoiceMap = new Map<string,any>();
        invoices.forEach((invoice:any) => {
            if(invoice.bookingId){
                invoiceMap.set(String(invoice.bookingId),invoice);
            }
        });

        const result = booking.map((booking:any) => ({
            ...booking,
            job:jobMap.get(String(booking._id)) || null,
            invoice:invoiceMap.get(String(booking._id)) || null,
        }));
        console.log("Result",result);

        return NextResponse.json({bookings:result});
     } catch (error:any) {
       return NextResponse.json({
        error:error.message || "Server error"
       },{status:error.status ||  500})
        
    }
    
}

