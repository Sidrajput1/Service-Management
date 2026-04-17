'use client';
import { useAssignJob, useJobs } from '@/hooks/useJobs';
import { useTechnicians } from '@/hooks/useLead';
import React, { useMemo, useState } from 'react'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Loader2,
  RefreshCw,
  Search,
  Users2,
  Wrench,
} from "lucide-react";
import { Input } from '@/components/ui/input';

function getStatusBadge(status?: string) {
  const s = (status || "new").toLowerCase();

  if (s.includes("complete") || s.includes("closed")) {
    return <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Completed</Badge>;
  }
  if (s.includes("progress") || s.includes("arrive") || s.includes("started")) {
    return <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">In Progress</Badge>;
  }
  if (s.includes("assigned")) {
    return <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">Assigned</Badge>;
  }
  if (s.includes("pending")) {
    return <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">Pending</Badge>;
  }
  return <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">New</Badge>;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}



function AdminJobsPage() {

    const [page, setPage] = useState(1);
    const [selectedTechnicians,setSelectedTechnicians] = useState<Record<string, string>>({});
    const [search, setSearch] = useState("");

    const { data: jobsData, isLoading,refetch } = useJobs(page, 20);
  const { data: techniciansData } = useTechnicians(1, 100);
  const assignJob = useAssignJob();

  const jobs = jobsData?.jobs || [];

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job: any) => {
      const service = job.bookingId?.serviceType || "";
      const customer = job.bookingId?.customerId?.name || "";
      const technician =
        job.technicianId?.userId?.name ||
        job.technicianId?.userId?.email ||
        "";
      return `${service} ${customer} ${technician}`.toLowerCase().includes(q);
    });
  }, [jobs, search]);

  const stats = useMemo(() => {
      const total = jobs.length;
      const assigned = jobs.filter((j:any) => j.technicianId).length;
      const unassigned = total - assigned;
      const completed = jobs.filter((j:any) => (j.status || "").toLowerCase().includes("complete")).length;

      return {total , assigned,unassigned,completed};
  },[jobs]);


  async function handleAssign(jobId: string) {
    const technicianId = selectedTechnicians[jobId];
    if (!technicianId) {
      toast.error("Please select a technician first");
      return;
    }
   // await assignJob.mutateAsync({ id: jobId, technicianId });
   try {
      await assignJob.mutateAsync({ id: jobId, technicianId });
      toast.success("Job assigned successfully");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign job");
    }
  }
  return (
    // <div className="p-6">
    //   <div className="mx-auto max-w-7xl space-y-6">
    //     <Card>
    //       <CardHeader>
    //         <CardTitle>Jobs</CardTitle>
    //       </CardHeader>
    //       <CardContent className="space-y-4">
    //         <div className="overflow-auto rounded-md border">
    //           <Table>
    //             <TableHeader>
    //               <TableRow>
    //                 <TableHead>Booking</TableHead>
    //                 <TableHead>Technician</TableHead>
    //                 <TableHead>Status</TableHead>
    //                 <TableHead>OTP Expiry</TableHead>
    //                 <TableHead>Assign / Reassign</TableHead>
    //               </TableRow>
    //             </TableHeader>
    //             <TableBody>
    //               {isLoading ? (
    //                 <TableRow>
    //                   <TableCell colSpan={5}>Loading...</TableCell>
    //                 </TableRow>
    //               ) : (
    //                 (jobsData?.jobs || []).map((job: any) => (
    //                   <TableRow key={job._id}>
    //                     <TableCell>
    //                       <div className="font-medium">
    //                         {job.bookingId?.serviceType || "Service"}
    //                       </div>
    //                       <div className="text-xs text-muted-foreground">
    //                         {job.bookingId?.customerId?.name || "Customer"}
    //                       </div>
    //                     </TableCell>

    //                     <TableCell>
    //                       {job.technicianId ? (
    //                         <div>
    //                           <div className="font-medium">
    //                             {job.technicianId?.userId?.name ||
    //                               job.technicianId?.userId?.email ||
    //                               "Technician"}
    //                           </div>
    //                           <div className="text-xs text-muted-foreground">
    //                             {job.technicianId?.status}
    //                           </div>
    //                         </div>
    //                       ) : (
    //                         <Badge variant="outline">Unassigned</Badge>
    //                       )}
    //                     </TableCell>

    //                     <TableCell>
    //                       <Badge>{job.status}</Badge>
    //                     </TableCell>

    //                     <TableCell>
    //                       {job.otpExpiresAt
    //                         ? new Date(job.otpExpiresAt).toLocaleString()
    //                         : "-"}
    //                     </TableCell>

    //                     <TableCell>
    //                       <div className="flex items-center gap-2">
    //                         <select
    //                           value={selectedTechnicians[job._id] || job.technicianId?._id || ""}
    //                           onChange={(e) =>
    //                             setSelectedTechnicians((prev) => ({
    //                               ...prev,
    //                               [job._id]: e.target.value,
    //                             }))
    //                           }
    //                           className="w-55 rounded-md border border-input bg-background px-3 py-2"
    //                         >
    //                           <option value="">Select technician</option>
    //                           {(techniciansData?.technicians || []).map((tech: any) => (
    //                             <option key={tech._id} value={tech._id}>
    //                               {tech.userId?.name || tech.userId?.email || "Technician"} — {tech.status}
    //                             </option>
    //                           ))}
    //                         </select>

    //                         <Button
    //                           size="sm"
    //                           onClick={() => handleAssign(job._id)}
    //                           disabled={assignJob.isPending}
    //                         >
    //                           {job.technicianId ? "Reassign" : "Assign"}
    //                         </Button>
    //                       </div>
    //                     </TableCell>
    //                   </TableRow>
    //                 ))
    //               )}
    //             </TableBody>
    //           </Table>
    //         </div>

    //         <div className="flex items-center justify-between">
    //           <div>Page {page}</div>
    //           <div className="flex gap-2">
    //             <Button
    //               variant="outline"
    //               disabled={page <= 1}
    //               onClick={() => setPage((p) => Math.max(1, p - 1))}
    //             >
    //               Prev
    //             </Button>
    //             <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
    //               Next
    //             </Button>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>
    //   </div>
    // </div>

     <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Jobs</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Assigned</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.assigned}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Unassigned</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.unassigned}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Jobs
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Assign or reassign technicians and monitor job progress
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search service, customer, technician..."
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => refetch?.()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Booking</TableHead>
                  <TableHead className="font-semibold text-slate-600">Technician</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">OTP Expiry</TableHead>
                  <TableHead className="font-semibold text-slate-600">Assign / Reassign</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      Loading jobs...
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-14 text-center">
                      <div className="mx-auto max-w-sm">
                        <p className="text-base font-medium text-slate-900">No jobs found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try a different search query.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job: any) => {
                    const currentTechId =
                      selectedTechnicians[job._id] ||
                      job.technicianId?._id ||
                      "";

                    return (
                      <TableRow key={job._id} className="hover:bg-slate-50/70">
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {job.bookingId?.serviceType || "Service"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {job.bookingId?.customerId?.name || "Customer"}
                          </div>
                          {job.bookingId?.scheduledAt && (
                            <div className="mt-1 text-xs text-slate-500">
                              Scheduled: {formatDate(job.bookingId.scheduledAt)}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          {job.technicianId ? (
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">
                                {job.technicianId?.userId?.name ||
                                  job.technicianId?.userId?.email ||
                                  "Technician"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {job.technicianId?.status || "-"}
                              </div>
                            </div>
                          ) : (
                            <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>{getStatusBadge(job.status)}</TableCell>

                        <TableCell className="text-slate-600">
                          {job.otpExpiresAt ? formatDate(job.otpExpiresAt) : "-"}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                            <Select
                              value={currentTechId}
                              onValueChange={(value) =>
                                setSelectedTechnicians((prev) => ({
                                  ...prev,
                                  [job._id]: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-11 w-full rounded-xl lg:w-60">
                                <SelectValue placeholder="Select technician" />
                              </SelectTrigger>
                              <SelectContent>
                                {(techniciansData?.technicians || []).map((tech: any) => (
                                  <SelectItem key={tech._id} value={tech._id}>
                                    {tech.userId?.name || tech.userId?.email || "Technician"} — {tech.status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              onClick={() => handleAssign(job._id)}
                              disabled={assignJob.isPending}
                              className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                            >
                              {assignJob.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : job.technicianId ? (
                                "Reassign"
                              ) : (
                                "Assign"
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-900">{page}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminJobsPage;