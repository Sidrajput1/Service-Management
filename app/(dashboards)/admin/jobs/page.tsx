'use client';
import { useAssignJob, useJobs } from '@/hooks/useJobs';
import { useTechnicians } from '@/hooks/useLead';
import React, { useState } from 'react'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function AdminJobsPage() {

    const [page, setPage] = useState(1);
    const [selectedTechnicians,setSelectedTechnicians] = useState<Record<string, string>>({});

    const { data: jobsData, isLoading } = useJobs(page, 20);
  const { data: techniciansData } = useTechnicians(1, 100);
  const assignJob = useAssignJob();

  async function handleAssign(jobId: string) {
    const technicianId = selectedTechnicians[jobId];
    if (!technicianId) return alert("Please select a technician");
    await assignJob.mutateAsync({ id: jobId, technicianId });
  }
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>OTP Expiry</TableHead>
                    <TableHead>Assign / Reassign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Loading...</TableCell>
                    </TableRow>
                  ) : (
                    (jobsData?.jobs || []).map((job: any) => (
                      <TableRow key={job._id}>
                        <TableCell>
                          <div className="font-medium">
                            {job.bookingId?.serviceType || "Service"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {job.bookingId?.customerId?.name || "Customer"}
                          </div>
                        </TableCell>

                        <TableCell>
                          {job.technicianId ? (
                            <div>
                              <div className="font-medium">
                                {job.technicianId?.userId?.name ||
                                  job.technicianId?.userId?.email ||
                                  "Technician"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {job.technicianId?.status}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge>{job.status}</Badge>
                        </TableCell>

                        <TableCell>
                          {job.otpExpiresAt
                            ? new Date(job.otpExpiresAt).toLocaleString()
                            : "-"}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedTechnicians[job._id] || job.technicianId?._id || ""}
                              onChange={(e) =>
                                setSelectedTechnicians((prev) => ({
                                  ...prev,
                                  [job._id]: e.target.value,
                                }))
                              }
                              className="w-55 rounded-md border border-input bg-background px-3 py-2"
                            >
                              <option value="">Select technician</option>
                              {(techniciansData?.technicians || []).map((tech: any) => (
                                <option key={tech._id} value={tech._id}>
                                  {tech.userId?.name || tech.userId?.email || "Technician"} — {tech.status}
                                </option>
                              ))}
                            </select>

                            <Button
                              size="sm"
                              onClick={() => handleAssign(job._id)}
                              disabled={assignJob.isPending}
                            >
                              {job.technicianId ? "Reassign" : "Assign"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div>Page {page}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminJobsPage;