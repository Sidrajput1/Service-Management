import { redirect, notFound } from "next/navigation";
import { requireCustomerProfile } from "@/lib/customer";
import Job from "@/models/job";
import Booking from "@/models/booking";
import { objectIdSchema } from "@/lib/pagination";
export default async function Page({params}:{params:Promise<{id:string}>}) { const {customer}=await requireCustomerProfile(); const id=objectIdSchema.parse((await params).id); const job=await Job.findById(id).select("bookingId").lean(); if(!job || !await Booking.exists({_id:job.bookingId,customerId:customer._id})) notFound(); redirect('/customer/bookings/'+job.bookingId); }
