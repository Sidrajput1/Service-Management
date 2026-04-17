"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  PlusCircle,
  Wrench,
} from "lucide-react";
import { useCustomerDashboard } from "@/hooks/useCustomer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import JobChatPanel from "../chat/JobChatPanel";

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {value}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-3 text-white">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomDash({ session }: any) {
  const { data, isLoading } = useCustomerDashboard();

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const summary = data?.summary || {};
  const requests = data?.requests || [];
  const jobs = data?.jobs || [];

  // useEffect(() => {
  //   if (!selectedJobId && jobs.length > 0) {
  //     setSelectedJobId(jobs[0]._id);
  //   }
  // }, [jobs, selectedJobId]);

  // const selectedJob = useMemo(
  //   () => jobs.find((job: any) => job._id === selectedJobId) || null,
  //   [jobs, selectedJobId],
  // );

  // console.log("selected job is:", selectedJob);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm text-slate-300">Customer dashboard</div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Book services, track jobs, and view your requests
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  You can request a service from the price master, follow the
                  job status, and later pay the invoice from the same account.
                </p>
              </div>

              <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/customer/book-service">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Book Service
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Requests"
            value={String(summary.totalRequests || 0)}
            icon={ClipboardList}
          />
          <StatCard
            title="Active Jobs"
            value={String(summary.activeJobs || 0)}
            icon={Wrench}
          />
          <StatCard
            title="Completed Jobs"
            value={String(summary.completedJobs || 0)}
            icon={CalendarDays}
          />
          <StatCard
            title="Pending Bills"
            value={String(summary.pendingInvoices || 0)}
            icon={CreditCard}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Service Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                  No requests yet. Book your first service.
                </div>
              ) : (
                requests.map((req: any) => (
                  <div
                    key={req._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">
                          {req.serviceRequested}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {req.remarks || "No note"}
                        </div>
                      </div>
                      <Badge>{req.status}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {new Date(req.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                  No jobs assigned yet.
                </div>
              ) : (
                jobs.map((job: any) => (
                  <div
                    key={job._id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">
                          {job.bookingId?.serviceType || "Service"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Technician:{" "}
                          {job.technicianId?.userId?.name || "Assigned later"}
                        </div>
                      </div>
                      <Badge>{job.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {jobs?.technicianId?.userId ? (
            <JobChatPanel
              jobId={jobs._id}
              currentUserId={session.user.id}
              currentUserRole={session.user.role}
              currentUserName={session.user.name}
            />
        ) : "No job found"}
        </div>
      </div>
    </div>
  );
}

export default CustomDash;
