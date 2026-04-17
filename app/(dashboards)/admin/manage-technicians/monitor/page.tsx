"use client";

import React, { useMemo, useState } from "react";
import { MapPinned, Phone, Mail, ShieldCheck, Clock3, Wrench, CreditCard, Filter, Search, UserRound } from "lucide-react";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminTechDetails, useAdminTechnicians, useUpdateAdminTechnician } from "@/hooks/useTechsByAdmin";

function formatCoords(location?: any) {
  if (!location?.coordinates?.length) return "-";
  const [lng, lat] = location.coordinates;
  return `${lat.toFixed?.(5) ?? lat}, ${lng.toFixed?.(5) ?? lng}`;
}

function mapLink(location?: any) {
  if (!location?.coordinates?.length) return "#";
  const [lng, lat] = location.coordinates;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export default function AdminTechnicianMonitorPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const { data, isLoading } = useAdminTechnicians(query, statusFilter);
  const { data: detail } = useAdminTechDetails(selectedId || undefined);
  const updateTechnician = useUpdateAdminTechnician();

  const technicians = data?.data?.technicians || [];
  const selectedTech = detail?.data?.technician || technicians[0];
  const selectedJobs = detail?.data?.jobs || [];
  const selectedPayments = detail?.data?.payments || [];

  const summary = useMemo(() => {
    const total = technicians.length;
    const active = technicians.filter((t: any) => t.isActive).length;
    const inactive = technicians.filter((t: any) => !t.isActive).length;
    const busy = technicians.filter((t: any) => t.status === "busy").length;
    return { total, active, inactive, busy };
  }, [technicians]);

  async function toggleActive(tech: any) {
    await updateTechnician.mutateAsync({
      id: tech._id,
      payload: { isActive: !tech.isActive },
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Technician monitoring center
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Track technicians, jobs, earnings, and location
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
                  See current status, active jobs, pending jobs, completed jobs, earnings, last work location, and live GPS location in one place.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatBox label="Total Technicians" value={summary.total} />
          <StatBox label="Active" value={summary.active} />
          <StatBox label="Inactive" value={summary.inactive} />
          <StatBox label="Busy" value={summary.busy} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="space-y-4">
              <CardTitle>Technicians</CardTitle>

              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, email, phone"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3"
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-155 pr-3">
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="text-sm text-slate-500">Loading technicians...</div>
                  ) : technicians.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                      No technicians found.
                    </div>
                  ) : (
                    technicians.map((tech: any) => {
                      const active = selectedId === tech._id;
                      return (
                        <button
                          key={tech._id}
                          onClick={() => setSelectedId(tech._id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{tech.userId?.name || tech.userId?.email || "Technician"}</div>
                              <div className={`mt-1 text-sm ${active ? "text-slate-300" : "text-slate-500"}`}>
                                {tech.userId?.phone || "-"} • {tech.status}
                              </div>
                            </div>
                            <Badge className={active ? "bg-white text-slate-950" : ""}>
                              {tech.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                            <div>Jobs: {tech.totalJobs || 0}</div>
                            <div>Done: {tech.completedJobs || 0}</div>
                            <div>Pending: {tech.pendingJobs || 0}</div>
                            <div>Earnings: ₹{tech.totalEarnings || 0}</div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Technician Detail</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedTech ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                  Select a technician to view full details.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-slate-950">
                          {selectedTech.userId?.name || "Technician"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {selectedTech.userId?.email || "-"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge>{selectedTech.status}</Badge>
                        <Badge variant={selectedTech.isActive ? "default" : "secondary"}>
                          {selectedTech.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => toggleActive(selectedTech)}
                      >
                        {selectedTech.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatBox label="Total Jobs" value={selectedTech.totalJobs || 0} />
                    <StatBox label="Completed Jobs" value={selectedTech.completedJobs || 0} />
                    <StatBox label="Pending Jobs" value={selectedTech.pendingJobs || 0} />
                    <StatBox label="Earnings" value={`₹${selectedTech.totalEarnings || 0}`} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-slate-900">Current Location</div>
                      <div className="mt-2 text-sm text-slate-600">
                        {formatCoords(selectedTech.currentLocation)}
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        Updated:{" "}
                        {selectedTech.currentLocation?.updatedAt
                          ? new Date(selectedTech.currentLocation.updatedAt).toLocaleString()
                          : "-"}
                      </div>
                      <Button
                        className="mt-3"
                        variant="outline"
                        size="sm"
                        disabled={!selectedTech.currentLocation?.coordinates?.length}
                        onClick={() => window.open(mapLink(selectedTech.currentLocation), "_blank")}
                      >
                        Open Map
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-slate-900">Last Completed Work</div>
                      <div className="mt-2 text-sm text-slate-600">
                        {formatCoords(selectedTech.lastCompletedWorkLocation)}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {selectedTech.lastCompletedWorkLocation?.addressText || "No address stored"}
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        Updated:{" "}
                        {selectedTech.lastCompletedWorkLocation?.updatedAt
                          ? new Date(selectedTech.lastCompletedWorkLocation.updatedAt).toLocaleString()
                          : "-"}
                      </div>
                      <Button
                        className="mt-3"
                        variant="outline"
                        size="sm"
                        disabled={!selectedTech.lastCompletedWorkLocation?.coordinates?.length}
                        onClick={() => window.open(mapLink(selectedTech.lastCompletedWorkLocation), "_blank")}
                      >
                        Open Last Job Map
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-medium text-slate-900">Recent Jobs</div>
                    <div className="space-y-3">
                      {selectedJobs.length === 0 ? (
                        <div className="text-sm text-slate-500">No jobs found.</div>
                      ) : (
                        selectedJobs.map((job: any) => (
                          <div key={job._id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-900">
                                  {job.bookingId?.serviceType || "Service"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {job.bookingId?.customerId?.name || "Customer"}
                                </div>
                              </div>
                              <Badge>{job.status}</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-medium text-slate-900">Recent Payments</div>
                    <div className="space-y-3">
                      {selectedPayments.length === 0 ? (
                        <div className="text-sm text-slate-500">No payments found.</div>
                      ) : (
                        selectedPayments.map((payment: any) => (
                          <div key={payment._id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-slate-900">₹{payment.amount}</div>
                                <div className="text-xs text-slate-500">
                                  {payment.mode} • {payment.gateway || "manual"}
                                </div>
                              </div>
                              <Badge>{payment.status}</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}