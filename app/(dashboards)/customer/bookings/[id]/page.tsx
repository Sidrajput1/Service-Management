"use client";

import { useCustomerBooking, useCustomerBookingsById } from '@/hooks/useCustomer';
import { useParams } from 'next/navigation';
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import BookingTimeline from '@/components/customer/BookingTimeline';

function CustomerBookingsDetails() {

    const params = useParams();
    const id = params?.id as string;

    const {data,isLoading} = useCustomerBookingsById(id);

    const booking = data?.booking;
    const job = data?.job;
    const invoice = data?.invoice;

    const timeline = data?.timeline || [];

    if(isLoading) return <div className='p-6'>Loading...</div>
    if(!booking) return <div className='p-6'>Booking not found</div>
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">
              {booking.serviceType}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Track your request in one place.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Booking Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div>
              <strong>Status:</strong> <Badge className="ml-2">{booking.status}</Badge>
            </div>
            <div>
              <strong>Scheduled:</strong>{" "}
              {booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : "-"}
            </div>
            <div>
              <strong>Address:</strong>{" "}
              {booking.address?.addressLine || "-"}
            </div>
            <div>
              <strong>City:</strong> {booking.address?.city || "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Tracking Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingTimeline steps={timeline} />
          </CardContent>
        </Card>

        {job ? (
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Technician Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div>
                <strong>Name:</strong> {job.technicianId?.userId?.name || "-"}
              </div>
              <div>
                <strong>Status:</strong> {job.status}
              </div>
              <div>
                <strong>Reached:</strong>{" "}
                {job.arrivedAt ? new Date(job.arrivedAt).toLocaleString() : "-"}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {invoice ? (
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-600">
                Invoice No: <strong>{invoice.invoiceNumber}</strong>
              </div>
              <div className="text-sm text-slate-600">
                Total: <strong>₹{invoice.grandTotal}</strong>
              </div>
              <div className="text-sm text-slate-600">
                Due: <strong>₹{invoice.balanceDue}</strong>
              </div>
              <Button  variant="outline">
                <Link href={`/customer/invoices/${invoice._id}`}>Open Invoice</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export default CustomerBookingsDetails;