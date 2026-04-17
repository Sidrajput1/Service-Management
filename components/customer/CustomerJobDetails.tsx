"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerJobById } from '@/hooks/useCustomer';
// import { Badge } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react'
import JobChatPanel from '../chat/JobChatPanel';

function CustomerJobDetails({session}:any) {
    const params = useParams();
    const id = params?.id as string;

    const {data,isLoading} = useCustomerJobById(id);
    const job = data?.job;

    if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!job) {
    return <div className="p-6">Job not found</div>;
  }
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">
              {job.bookingId?.serviceType || "Service Job"}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Status updates, technician details, proof, and invoice.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div>
              <strong>Status:</strong> <Badge className="ml-2">{job.status}</Badge>
            </div>
            <div>
              <strong>Technician:</strong>{" "}
              {job.technicianId?.userId?.name || "Not assigned yet"}
            </div>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
  <CardHeader>
    <CardTitle>Technician</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3 text-sm text-slate-600">
    <div>
      <strong>Name:</strong> {job.technicianId?.userId?.name || "Not assigned yet"}
    </div>
    <div>
      <strong>Phone:</strong> {job.technicianId?.userId?.phone || "-"}
    </div>

    {job.technicianId?.userId ? (
      <JobChatPanel
        jobId={job._id}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        currentUserName={session.user.name}
      />
    ) : null}
  </CardContent>
</Card>
            <div>
              <strong>Started:</strong>{" "}
              {job.startTime ? new Date(job.startTime).toLocaleString() : "-"}
            </div>
            <div>
              <strong>Completed:</strong>{" "}
              {job.endTime ? new Date(job.endTime).toLocaleString() : "-"}
            </div>
            <div>
              <strong>Notes:</strong> {job.notes || "-"}
            </div>
          </CardContent>
        </Card>

        {job.invoiceId ? (
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-600">
                Invoice Number: <strong>{job.invoiceId.invoiceNumber}</strong>
              </div>
              <div className="text-sm text-slate-600">
                Total: <strong>₹{job.invoiceId.grandTotal}</strong>
              </div>
              <div className="text-sm text-slate-600">
                Paid: <strong>₹{job.invoiceId.amountPaid}</strong>
              </div>
              <div className="text-sm text-slate-600">
                Due: <strong>₹{job.invoiceId.balanceDue}</strong>
              </div>
              <Button asChild variant="outline">
                <Link href={`/customer/invoice/${job.invoiceId._id}`}>
                  Open Invoice
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export default CustomerJobDetails;