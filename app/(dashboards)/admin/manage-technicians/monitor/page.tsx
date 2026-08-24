"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity, MapPinned, Phone, Mail, ShieldCheck, Clock3, Wrench, CreditCard, Filter, Search, UserRound, Users2, Wallet, Star, ClipboardIcon, CheckCircle2, PhoneCall, Map, Loader2, Truck } from "lucide-react";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminTechDetails, useAdminTechnicians, useUpdateAdminTechnician } from "@/hooks/useTechsByAdmin";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function formatCoords(location?: any) {
  if (!location?.coordinates?.length) return "-";
  const [lng, lat] = location.coordinates;
//return `${lat.toFixed?.(5) ?? lat}, ${lng.toFixed?.(5) ?? lng}`;
 const safeLat = typeof lat?.toFixed === "function" ? lat.toFixed(5) : lat;
  const safeLng = typeof lng?.toFixed === "function" ? lng.toFixed(5) : lng;
  return `${safeLat}, ${safeLng}`;
}

function mapLink(location?: any) {
  if (!location?.coordinates?.length) return "#";
  const [lng, lat] = location.coordinates;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};



function getUserName(user?: any) {
  if (!user) return "Technician";
  if (typeof user === "string") return "Technician";
  return user.name || user.email || "Technician";
}

function getUserEmail(user?: any) {
  if (!user || typeof user === "string") return "-";
  return user.email || "-";
}

function getUserPhone(user?: any) {
  if (!user || typeof user === "string") return "-";
  return user.phone || "-";
}

function getInitials(name?: string) {
  if (!name) return "T";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function StatBox({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
          {subtext ? (
            <div className="mt-1 text-xs text-muted-foreground">{subtext}</div>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40 text-foreground">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = (status || "").toLowerCase();

  if (value.includes("busy")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        Busy
      </Badge>
    );
  }

  if (value.includes("active") || value.includes("online")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Active
      </Badge>
    );
  }

  if (value.includes("inactive") || value.includes("offline")) {
    return (
      <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
        Inactive
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-slate-500/20 bg-slate-500/10 text-slate-700 hover:bg-slate-500/10 dark:text-slate-400">
      {status || "Unknown"}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-75 items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50">
          <Users2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          No technicians found
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Try a different search term or clear the status filter.
        </p>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-9 animate-pulse rounded-xl bg-muted" />
            <div className="h-9 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      ))}
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

  //const technicians = data?.data?.technicians || [];

  const rawTechnicians = data?.data?.technicians || [];

  // Apply client-side filtering based on search query and status filter
  const technicians = useMemo(() => {
    const q = query.trim().toLowerCase();

    // If no search query or status filter, return all technicians
    if (!q && !statusFilter) {
      return rawTechnicians;
    }

    return rawTechnicians.filter((tech: any) => {
      const name = getUserName(tech.userId).toLowerCase();
      const email = getUserEmail(tech.userId).toLowerCase();
      const phone = getUserPhone(tech.userId).toLowerCase();
      const status = (tech.status || "").toLowerCase();

    const matchesQuery =
      !q || `${name} ${email} ${phone}`.includes(q);

    const matchesStatus =
      !statusFilter
        ? true
        : statusFilter === "active"
          ? !!tech.isActive
          : statusFilter === "inactive"
            ? !tech.isActive
            : statusFilter === "busy"
              ? status.includes("busy")
              : true;

    return matchesQuery && matchesStatus;
  });
  },[rawTechnicians, query, statusFilter]);

  useEffect(() => {
    if(!technicians.length){
      setSelectedId("");
      return;
    };

    const stillVisible = technicians.some((tech:any) => tech._id === selectedId);

    if(!selectedId || !stillVisible){
      setSelectedId(technicians[0]._id);
    }
  },[technicians,selectedId]);


  // const selectedTech = detail?.data?.technician ;
  // const selectedJobs = detail?.data?.jobs || [];
  // const selectedPayments = detail?.data?.payments || [];

  const detailMatchesSelection =
  !!selectedId &&
  String(detail?.data?.technician?._id || "") === String(selectedId);

const selectedTech = useMemo(() => {
  if (detailMatchesSelection) return detail?.data?.technician || null;
  if (selectedId) {
    return technicians.find((tech: any) => tech._id === selectedId) || null;
  }
  return technicians[0] || null;
}, [detailMatchesSelection, detail, selectedId, technicians]);

const selectedJobs = detailMatchesSelection ? detail?.data?.jobs || [] : [];
const selectedPayments = detailMatchesSelection ? detail?.data?.payments || [] : [];

  const summary = useMemo(() => {
    const total = technicians.length;
    const active = technicians.filter((t: any) => t.isActive).length;
    const inactive = technicians.filter((t: any) => !t.isActive).length;
    const busy = technicians.filter((t: any) => t.status === "busy").length;
    const totalEarnings = technicians.reduce(
      (sum:number,t:any) => sum + (Number(t.totalEarnings) || 0),0
    );

    const totalPayments = technicians.reduce(
      (sum:number,t:any) => sum + (Number(t.paymentCount) || 0),
      0,
    );
    return { total, active, inactive, busy,totalEarnings, totalPayments };
  }, [technicians]);

   const selectedStats = useMemo(() => {
    if (!selectedTech) {
      return {
        completionRate: 0,
        earningsPerPayment: 0,
      };
    }

    const totalJobs = Number(selectedTech.totalJobs) || 0;
    const completedJobs = Number(selectedTech.completedJobs) || 0;
    const paymentCount = Number(selectedTech.paymentCount) || 0;
    const totalEarnings = Number(selectedTech.totalEarnings) || 0;

    return {
      completionRate: totalJobs ? Math.round((completedJobs / totalJobs) * 100) : 0,
      earningsPerPayment: paymentCount ? Math.round(totalEarnings / paymentCount) : 0,
    };
  }, [selectedTech]);

  async function toggleActive(tech: any) {
    await updateTechnician.mutateAsync({
      id: tech._id,
      payload: { isActive: !tech.isActive },
    });
  };

  const handleOpenMap = (location?: any) => {
    const url = mapLink(location);
    if (url === "#") {
      toast.error("Location not available");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const currentName = getUserName(selectedTech?.userId);
  const currentPhone = getUserPhone(selectedTech?.userId);
  const currentEmail = getUserEmail(selectedTech?.userId);

  return (
    // <div className="min-h-screen bg-slate-100 p-6">
    //   <div className="mx-auto max-w-7xl space-y-6">
    //     <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
    //       <CardContent className="p-6 sm:p-8">
    //         <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    //           <div>
    //             <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
    //               <ShieldCheck className="h-3.5 w-3.5" />
    //               Technician monitoring center
    //             </div>
    //             <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
    //               Track technicians, jobs, earnings, and location
    //             </h1>
    //             <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
    //               See current status, active jobs, pending jobs, completed jobs, earnings, last work location, and live GPS location in one place.
    //             </p>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    //       <StatBox label="Total Technicians" value={summary.total} />
    //       <StatBox label="Active" value={summary.active} />
    //       <StatBox label="Inactive" value={summary.inactive} />
    //       <StatBox label="Busy" value={summary.busy} />
    //     </div>

    //     <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
    //       <Card className="rounded-3xl border-slate-200 shadow-sm">
    //         <CardHeader className="space-y-4">
    //           <CardTitle>Technicians</CardTitle>

    //           <div className="grid gap-3 md:grid-cols-[1fr_180px]">
    //             <div className="relative">
    //               <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    //               <Input
    //                 value={query}
    //                 onChange={(e) => setQuery(e.target.value)}
    //                 placeholder="Search by name, email, phone"
    //                 className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10"
    //               />
    //             </div>

    //             <select
    //               value={statusFilter}
    //               onChange={(e) => setStatusFilter(e.target.value)}
    //               className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3"
    //             >
    //               <option value="">All</option>
    //               <option value="active">Active</option>
    //               <option value="inactive">Inactive</option>
    //             </select>
    //           </div>
    //         </CardHeader>

    //         <CardContent>
    //           <ScrollArea className="h-155 pr-3">
    //             <div className="space-y-3">
    //               {isLoading ? (
    //                 <div className="text-sm text-slate-500">Loading technicians...</div>
    //               ) : technicians.length === 0 ? (
    //                 <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
    //                   No technicians found.
    //                 </div>
    //               ) : (
    //                 technicians.map((tech: any) => {
    //                   const active = selectedId === tech._id;
    //                   return (
    //                     <button
    //                       key={tech._id}
    //                       onClick={() => setSelectedId(tech._id)}
    //                       className={`w-full rounded-2xl border p-4 text-left transition ${
    //                         active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
    //                       }`}
    //                     >
    //                       <div className="flex items-start justify-between gap-3">
    //                         <div>
    //                           <div className="font-medium">{tech.userId?.name || tech.userId?.email || "Technician"}</div>
    //                           <div className={`mt-1 text-sm ${active ? "text-slate-300" : "text-slate-500"}`}>
    //                             {tech.userId?.phone || "-"} • {tech.status}
    //                           </div>
    //                         </div>
    //                         <Badge className={active ? "bg-white text-slate-950" : ""}>
    //                           {tech.isActive ? "Active" : "Inactive"}
    //                         </Badge>
    //                       </div>

    //                       <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
    //                         <div>Jobs: {tech.totalJobs || 0}</div>
    //                         <div>Done: {tech.completedJobs || 0}</div>
    //                         <div>Pending: {tech.pendingJobs || 0}</div>
    //                         <div>Earnings: ₹{tech.totalEarnings || 0}</div>
    //                       </div>
    //                     </button>
    //                   );
    //                 })
    //               )}
    //             </div>
    //           </ScrollArea>
    //         </CardContent>
    //       </Card>

    //       <Card className="rounded-3xl border-slate-200 shadow-sm">
    //         <CardHeader>
    //           <CardTitle>Technician Detail</CardTitle>
    //         </CardHeader>
    //         <CardContent>
    //           {!selectedTech ? (
    //             <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
    //               Select a technician to view full details.
    //             </div>
    //           ) : (
    //             <div className="space-y-5">
    //               <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //                 <div className="flex items-start justify-between gap-3">
    //                   <div>
    //                     <div className="text-lg font-semibold text-slate-950">
    //                       {selectedTech.userId?.name || "Technician"}
    //                     </div>
    //                     <div className="mt-1 text-sm text-slate-500">
    //                       {selectedTech.userId?.email || "-"}
    //                     </div>
    //                   </div>
    //                   <div className="flex flex-col items-end gap-2">
    //                     <Badge>{selectedTech.status}</Badge>
    //                     <Badge variant={selectedTech.isActive ? "default" : "secondary"}>
    //                       {selectedTech.isActive ? "Active" : "Inactive"}
    //                     </Badge>
    //                   </div>
    //                 </div>

    //                 <div className="mt-4 flex flex-wrap gap-2">
    //                   <Button
    //                     variant="outline"
    //                     onClick={() => toggleActive(selectedTech)}
    //                   >
    //                     {selectedTech.isActive ? "Deactivate" : "Activate"}
    //                   </Button>
    //                 </div>
    //               </div>

    //               <div className="grid gap-3 sm:grid-cols-2">
    //                 <StatBox label="Total Jobs" value={selectedTech.totalJobs || 0} />
    //                 <StatBox label="Completed Jobs" value={selectedTech.completedJobs || 0} />
    //                 <StatBox label="Pending Jobs" value={selectedTech.pendingJobs || 0} />
    //                 <StatBox label="Earnings" value={`₹${selectedTech.totalEarnings || 0}`} />
    //               </div>

    //               <div className="grid gap-3 sm:grid-cols-2">
    //                 <div className="rounded-2xl border border-slate-200 bg-white p-4">
    //                   <div className="text-sm font-medium text-slate-900">Current Location</div>
    //                   <div className="mt-2 text-sm text-slate-600">
    //                     {formatCoords(selectedTech.currentLocation)}
    //                   </div>
    //                   <div className="mt-3 text-xs text-slate-500">
    //                     Updated:{" "}
    //                     {selectedTech.currentLocation?.updatedAt
    //                       ? new Date(selectedTech.currentLocation.updatedAt).toLocaleString()
    //                       : "-"}
    //                   </div>
    //                   <Button
    //                     className="mt-3"
    //                     variant="outline"
    //                     size="sm"
    //                     disabled={!selectedTech.currentLocation?.coordinates?.length}
    //                     onClick={() => window.open(mapLink(selectedTech.currentLocation), "_blank")}
    //                   >
    //                     Open Map
    //                   </Button>
    //                 </div>

    //                 <div className="rounded-2xl border border-slate-200 bg-white p-4">
    //                   <div className="text-sm font-medium text-slate-900">Last Completed Work</div>
    //                   <div className="mt-2 text-sm text-slate-600">
    //                     {formatCoords(selectedTech.lastCompletedWorkLocation)}
    //                   </div>
    //                   <div className="mt-2 text-xs text-slate-500">
    //                     {selectedTech.lastCompletedWorkLocation?.addressText || "No address stored"}
    //                   </div>
    //                   <div className="mt-3 text-xs text-slate-500">
    //                     Updated:{" "}
    //                     {selectedTech.lastCompletedWorkLocation?.updatedAt
    //                       ? new Date(selectedTech.lastCompletedWorkLocation.updatedAt).toLocaleString()
    //                       : "-"}
    //                   </div>
    //                   <Button
    //                     className="mt-3"
    //                     variant="outline"
    //                     size="sm"
    //                     disabled={!selectedTech.lastCompletedWorkLocation?.coordinates?.length}
    //                     onClick={() => window.open(mapLink(selectedTech.lastCompletedWorkLocation), "_blank")}
    //                   >
    //                     Open Last Job Map
    //                   </Button>
    //                 </div>
    //               </div>

    //               <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //                 <div className="mb-3 text-sm font-medium text-slate-900">Recent Jobs</div>
    //                 <div className="space-y-3">
    //                   {selectedJobs.length === 0 ? (
    //                     <div className="text-sm text-slate-500">No jobs found.</div>
    //                   ) : (
    //                     selectedJobs.map((job: any) => (
    //                       <div key={job._id} className="rounded-xl border border-slate-200 bg-white p-3">
    //                         <div className="flex items-start justify-between gap-3">
    //                           <div>
    //                             <div className="font-medium text-slate-900">
    //                               {job.bookingId?.serviceType || "Service"}
    //                             </div>
    //                             <div className="text-xs text-slate-500">
    //                               {job.bookingId?.customerId?.name || "Customer"}
    //                             </div>
    //                           </div>
    //                           <Badge>{job.status}</Badge>
    //                         </div>
    //                       </div>
    //                     ))
    //                   )}
    //                 </div>
    //               </div>

    //               <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //                 <div className="mb-3 text-sm font-medium text-slate-900">Recent Payments</div>
    //                 <div className="space-y-3">
    //                   {selectedPayments.length === 0 ? (
    //                     <div className="text-sm text-slate-500">No payments found.</div>
    //                   ) : (
    //                     selectedPayments.map((payment: any) => (
    //                       <div key={payment._id} className="rounded-xl border border-slate-200 bg-white p-3">
    //                         <div className="flex items-center justify-between">
    //                           <div>
    //                             <div className="font-medium text-slate-900">₹{payment.amount}</div>
    //                             <div className="text-xs text-slate-500">
    //                               {payment.mode} • {payment.gateway || "manual"}
    //                             </div>
    //                           </div>
    //                           <Badge>{payment.status}</Badge>
    //                         </div>
    //                       </div>
    //                     ))
    //                   )}
    //                 </div>
    //               </div>
    //             </div>
    //           )}
    //         </CardContent>
    //       </Card>
    //     </div>
    //   </div>
    // </div>

     <div className="space-y-8 bg-background text-foreground">
      {/* Header */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border/70 bg-linear-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white dark:from-white dark:via-slate-100 dark:to-slate-200 dark:text-slate-950 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Technician monitoring center
                </div>
                <div className="space-y-2">
                  <h1 className="font-poppins text-3xl font-semibold tracking-tight sm:text-4xl">
                    Track technicians, earnings, and live location
                  </h1>
                  <p className="max-w-3xl text-sm text-white/70 dark:text-slate-600 sm:text-base">
                    See rating, payments, job counts, active status, vehicle
                    type, skills, and current location in one premium workspace.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 dark:border-slate-300 dark:bg-white/70">
                  <p className="text-xs text-white/60 dark:text-slate-500">
                    Selected technician
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white dark:text-slate-950">
                    {currentName}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 dark:border-slate-300 dark:bg-white/70">
                  <p className="text-xs text-white/60 dark:text-slate-500">
                    Current status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selectedTech?.status} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 dark:border-slate-300 dark:bg-white/70">
                  <p className="text-xs text-white/60 dark:text-slate-500">
                    Active
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white dark:text-slate-950">
                    {selectedTech?.isActive ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBox
          label="Total Technicians"
          value={summary.total}
          subtext="All technicians returned by the API"
          icon={<Users2 className="h-4 w-4" />}
        />
        <StatBox
          label="Active"
          value={summary.active}
          subtext="Currently available technicians"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatBox
          label="Busy"
          value={summary.busy}
          subtext="Technicians on active jobs"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatBox
          label="Total Earnings"
          value={`₹${summary.totalEarnings}`}
          subtext={`${summary.totalPayments} payments recorded`}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      {/* Main layout */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* List */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-4 border-b border-border/70">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-xl font-semibold">Technicians</CardTitle>
              <CardDescription>
                Search, filter, and open full technician profiles.
              </CardDescription>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedId("");
                  }}
                  placeholder="Search by name, email, or phone"
                  className="h-11 rounded-2xl pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSelectedId("");
                }}
                className="h-11 rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                 <option value="inactive">Busy</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
                All
              </Badge>
              <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
                Active
              </Badge>
              <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
                Busy
              </Badge>
              <Badge variant="secondary" className="rounded-full border border-border bg-muted text-muted-foreground">
                Earnings
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {isLoading ? (
              <ListSkeleton />
            ) : technicians.length === 0 ? (
              <EmptyState />
            ) : (
              <ScrollArea className="h-230 pr-3">
                <div className="space-y-3">
                  {technicians.map((tech: any) => {
                   // const active = (selectedTech?._id || selectedId) === tech._id;

                   const active = selectedTech?._id === tech._id;
                    const name = getUserName(tech.userId);
                    const email = getUserEmail(tech.userId);
                    const phone = getUserPhone(tech.userId);

                    return (
                      <button
                        key={tech._id}
                        onClick={() => setSelectedId(tech._id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
                            : "border-border bg-background hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-11 w-11 border border-border">
                              <AvatarFallback
                                className={`text-sm font-semibold ${
                                  active
                                    ? "bg-white text-slate-950 dark:bg-slate-950 dark:text-white"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <div className="truncate font-medium">{name}</div>
                              <div
                                className={`mt-1 truncate text-sm ${
                                  active ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"
                                }`}
                              >
                                {phone} • {email}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <StatusBadge status={tech.status} />
                            <Badge
                              className={
                                active
                                  ? "rounded-full border-white/10 bg-white text-slate-950 hover:bg-white dark:border-slate-300 dark:bg-slate-950 dark:text-white"
                                  : "rounded-full border-border bg-muted text-muted-foreground"
                              }
                            >
                              {tech.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        <div
                          className={`mt-4 grid grid-cols-2 gap-2 text-xs ${
                            active ? "text-white/75 dark:text-slate-600" : "text-muted-foreground"
                          }`}
                        >
                          <div className="rounded-xl border border-border/60 px-3 py-2">
                            Jobs: {tech.totalJobs || 0}
                          </div>
                          <div className="rounded-xl border border-border/60 px-3 py-2">
                            Done: {tech.completedJobs || 0}
                          </div>
                          <div className="rounded-xl border border-border/60 px-3 py-2">
                            Pending: {tech.pendingJobs || 0}
                          </div>
                          <div className="rounded-xl border border-border/60 px-3 py-2">
                            Earnings: ₹{tech.totalEarnings || 0}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`rounded-full ${
                              active
                                ? "border-white/10 bg-white/10 text-white dark:border-slate-300 dark:bg-slate-100 dark:text-slate-700"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            Rating: {Number(tech.rating || 0).toFixed(1)}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`rounded-full ${
                              active
                                ? "border-white/10 bg-white/10 text-white dark:border-slate-300 dark:bg-slate-100 dark:text-slate-700"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            Vehicle: {tech.vehicleType || "-"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="space-y-3 border-b border-border/70">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">
                    Technician detail
                  </CardTitle>
                  <CardDescription>
                    Full profile, activity, earnings, location, and payments.
                  </CardDescription>
                </div>

                {selectedTech ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => toggleActive(selectedTech)}
                      disabled={updateTechnician.isPending}
                    >
                      {updateTechnician.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : selectedTech.isActive ? (
                        "Deactivate"
                      ) : (
                        "Activate"
                      )}
                    </Button>

                    <Button
                      className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                      onClick={() => handleOpenMap(selectedTech.currentLocation)}
                    >
                      <Map className="mr-2 h-4 w-4" />
                      Open map
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {!selectedTech ? (
                <EmptyState />
              ) : (
                <div className="space-y-6">
                  {/* Profile card */}
                  <div className="rounded-3xl border border-border bg-muted/20 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border border-border">
                          <AvatarFallback className="bg-background text-base font-semibold text-foreground">
                            {getInitials(currentName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-foreground">
                            {currentName}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusBadge status={selectedTech.status} />
                            <Badge className="rounded-full border-border bg-background text-muted-foreground">
                              {selectedTech.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge className="rounded-full border-border bg-background text-muted-foreground">
                              {selectedTech.vehicleType || "Vehicle not set"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:items-end">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{currentEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PhoneCall className="h-4 w-4" />
                          <span>{currentPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <StatBox
                      label="Rating"
                      value={Number(selectedTech.rating || 0).toFixed(1)}
                      subtext="Current technician rating"
                      icon={<Star className="h-4 w-4" />}
                    />
                    <StatBox
                      label="Total Jobs"
                      value={selectedTech.totalJobs || 0}
                      subtext={`Completion rate ${selectedStats.completionRate}%`}
                      icon={<ClipboardIcon />}
                    />
                    <StatBox
                      label="Completed Jobs"
                      value={selectedTech.completedJobs || 0}
                      subtext="Jobs finished successfully"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                    />
                    <StatBox
                      label="Pending Jobs"
                      value={selectedTech.pendingJobs || 0}
                      subtext="Jobs waiting in the queue"
                      icon={<Clock3 className="h-4 w-4" />}
                    />
                    <StatBox
                      label="Active Jobs"
                      value={selectedTech.activeJobs || 0}
                      subtext="Currently in progress"
                      icon={<Activity className="h-4 w-4" />}
                    />
                    <StatBox
                      label="Earnings"
                      value={`₹${selectedTech.totalEarnings || 0}`}
                      subtext={`₹${selectedStats.earningsPerPayment} avg/payment`}
                      icon={<Wallet className="h-4 w-4" />}
                    />
                  </div>

                  {/* More profile data */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                      <SectionTitle
                        title="Operational profile"
                        description="Key technician details used for dispatch and monitoring."
                      />
                      <Separator className="my-4" />
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium text-foreground">
                            {selectedTech.status || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Active</span>
                          <span className="font-medium text-foreground">
                            {selectedTech.isActive ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Payment count</span>
                          <span className="font-medium text-foreground">
                            {selectedTech.paymentCount || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Last job</span>
                          <span className="font-medium text-foreground">
                            {selectedTech.lastJobAt ? new Date(selectedTech.lastJobAt).toLocaleString() : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Jobs completed</span>
                          <span className="font-medium text-foreground">
                            {selectedTech.jobsCompleted || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                      <SectionTitle
                        title="Skills and vehicle"
                        description="Use this for job matching and dispatch decisions."
                      />
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Skills
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(selectedTech.skills || []).length ? (
                              selectedTech.skills.map((skill: string) => (
                                <Badge
                                  key={skill}
                                  className="rounded-full border-border bg-muted text-muted-foreground"
                                >
                                  {skill}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No skills listed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-muted/20 p-4">
                            <p className="text-xs text-muted-foreground">Vehicle type</p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedTech.vehicleType || "-"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-muted/20 p-4">
                            <p className="text-xs text-muted-foreground">Joined</p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedTech.createdAt ? new Date(selectedTech.createdAt).toLocaleDateString() : "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                      <SectionTitle
                        title="Current location"
                        description="Live GPS position of the technician."
                      />
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <p className="text-xs text-muted-foreground">Coordinates</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {formatCoords(selectedTech.currentLocation)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <p className="text-xs text-muted-foreground">Map link</p>
                          <p className="mt-1 truncate text-sm text-foreground">
                            {mapLink(selectedTech.currentLocation)}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full rounded-2xl"
                          disabled={!selectedTech.currentLocation?.coordinates?.length}
                          onClick={() => handleOpenMap(selectedTech.currentLocation)}
                        >
                          <MapPinned className="mr-2 h-4 w-4" />
                          Open current location
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                      <SectionTitle
                        title="Last completed work location"
                        description="Where the technician last finished a job."
                      />
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <p className="text-xs text-muted-foreground">Coordinates</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {formatCoords(selectedTech.lastCompletedWorkLocation)}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full rounded-2xl"
                          disabled={!selectedTech.lastCompletedWorkLocation?.coordinates?.length}
                          onClick={() =>
                            handleOpenMap(selectedTech.lastCompletedWorkLocation)
                          }
                        >
                          <Truck className="mr-2 h-4 w-4" />
                          Open last work map
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Jobs */}
                  <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <SectionTitle
                      title="Recent jobs"
                      description="Latest work history for this technician."
                    />
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      {selectedJobs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                          No jobs found for this technician.
                        </div>
                      ) : (
                        selectedJobs.map((job: any) => (
                          <div
                            key={job._id}
                            className="rounded-2xl border border-border bg-muted/20 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {job.bookingId?.serviceType || "Service"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Customer:{" "}
                                  {job.bookingId?.customerId?.name || "Customer"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Scheduled:{" "}
                                  {job.scheduledAt
                                    ? new Date(job.scheduledAt).toLocaleString()
                                    : "-"}
                                </p>
                              </div>
                              <StatusBadge status={job.status} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Payments */}
                  <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <SectionTitle
                      title="Payments"
                      description="Payout and payment records for this technician."
                    />
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      {selectedPayments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                          No payments found for this technician.
                        </div>
                      ) : (
                        selectedPayments.map((payment: any) => (
                          <div
                            key={payment._id}
                            className="rounded-2xl border border-border bg-muted/20 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">
                                  ₹{payment.amount || 0}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {payment.mode || "manual"} •{" "}
                                  {payment.gateway || "manual"}
                                </p>
                              </div>
                              <Badge className="rounded-full border-border bg-background text-muted-foreground">
                                {payment.status || "unknown"}
                              </Badge>
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