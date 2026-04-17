"use client";

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerBooking } from '@/hooks/useCustomer';
import Link from 'next/link';
import React from 'react'

function CustomerBookingPage() {
    const {data,isLoading} = useCustomerBooking();

    const bookings = data?.bookings || [];
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">My Bookings</h1>
            <p className="mt-2 text-sm text-slate-300">
              Track every service request from booking to payment.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : bookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                No bookings yet.
              </div>
            ) : (
              bookings.map((booking: any) => (
                <Link
                  key={booking._id}
                  href={`/customer/bookings/${booking._id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {booking.serviceType || "Service"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : "No schedule"}
                      </div>
                    </div>
                    <Badge>{booking.status}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CustomerBookingPage;