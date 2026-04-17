"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerJobs } from '@/hooks/useCustomer';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import React from 'react'
import JobChatPanel from '@/components/chat/JobChatPanel';

function CustomerJobPage() {

    const {data,isLoading} = useCustomerJobs();
    const jobs = data?.jobs || [];
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">My Jobs</h1>
            <p className="mt-2 text-sm text-slate-300">
              Track your service jobs, technician status, and completion updates.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Jobs list</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                No jobs yet.
              </div>
            ) : (
              jobs.map((job: any) => (
                <Link
                  key={job._id}
                  href={`/customer/jobs/${job._id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {job.bookingId?.serviceType || "Service"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Technician: {job.technicianId?.userId?.name || "Not assigned yet"}
                      </div>
                    </div>
                    <Badge>{job.status}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
       <div>
                {/* {selectedJob ? (
                  <JobChatPanel
                    jobId={selectedJob._id}
                    currentUserId={session.user.id}
                    currentUserRole={session.user.role}
                    currentUserName={session.user.name}
                  />
              ) : "No job found"} */}
              </div>
    </div>

  )
}

export default CustomerJobPage