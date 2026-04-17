"use client";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ChatWindow from "@/components/chat/ChatWindow";
import JobChatPanel from "@/components/chat/JobChatPanel";
import CollectPaymentActions from "@/components/payments/CollectPaymentActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  useAcceptTechnicianJob,
  useArriveTechnicianJob,
  useCompleteTechnicianJob,
  useStartTechnicianJob,
  useTechnicianJobs,
  useUploadTechnicianProof,
} from "@/hooks/useTechnicianJobs";
import { uploadToCloudinary } from "@/lib/cloudinary";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock3,
  FileImage,
  Home,
  MapPin,
  MapPinned,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { useEffect, useMemo, useState } from "react";
import ChatBtn from "../chat/ChatBtn";
import { useRouter } from "next/navigation";
import Link from "next/link";

// const revenueData = [
//   { name: "Mon", value: 12000 },
//   { name: "Tue", value: 15000 },
//   { name: "Wed", value: 9000 },
//   { name: "Thu", value: 18000 },
//   { name: "Fri", value: 21000 },
//   { name: "Sat", value: 17000 },
//   { name: "Sun", value: 24000 },
// ];

// const technicianStats = [
//   { label: "Jobs Assigned", value: "8", change: "+2", icon: ClipboardList },
//   { label: "Jobs Done", value: "5", change: "+1", icon: CheckCircle2 },
//   { label: "Active Route", value: "18 km", change: "Live", icon: MapPinned },
//   { label: "Rating", value: "4.8/5", change: "Top 10%", icon: Star },
// ];

// const techJobs = [
//   {
//     name: "AC Service - Sharma Residence",
//     status: "On the way",
//     time: "10:30 AM",
//     badge: "bg-sky-500/10 text-sky-600 border-sky-500/20",
//   },
//   {
//     name: "Washing Machine Repair",
//     status: "OTP pending",
//     time: "12:00 PM",
//     badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
//   },
//   {
//     name: "RO Filter Replacement",
//     status: "Completed",
//     time: "Yesterday",
//     badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
//   },
// ];

// function StatCard({ label, value, change, icon: Icon }: any) {
//   return (
//     <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
//       <CardContent className="p-5">
//         <div className="flex items-start justify-between gap-4">
//           <div>
//             <p className="text-sm text-slate-500">{label}</p>
//             <div className="mt-2 flex items-end gap-3">
//               <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{value}</h3>
//               <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
//                 {change}
//               </span>
//             </div>
//           </div>
//           <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/20">
//             <Icon className="h-5 w-5" />
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();

  if (["completed", "done", "closed"].includes(s)) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Completed
      </Badge>
    );
  }
  if (["accepted", "arrived", "in_progress", "on_hold"].includes(s)) {
    return (
      <Badge className="rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
        Active
      </Badge>
    );
  }
  if (["assigned", "scheduled"].includes(s)) {
    return (
      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
        Assigned
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
      {status || "New"}
    </Badge>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-white/15 p-2">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-xl font-semibold leading-none text-white">
            {value}
          </div>
          <div className="text-xs text-white/70">{label}</div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

const statusOrder = [
  "assigned",
  //"accepted", // skipping accepted as it's a quick transition and doesn't have much UI impact
  "enroute",
  "arrived",
  "in_progress",
  "completed",
] as const;

function stepIndex(status: string) {
  return statusOrder.indexOf(status as any);
}

async function filteToDataUrl(file: File) {
  return await new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result));
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function TechDash({ session }: any) {
  const router = useRouter();
  const { data, isLoading } = useTechnicianJobs();

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [otp, setOtp] = useState("");
  const [proofNote, setProofNote] = useState("");

  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const acceptJob = useAcceptTechnicianJob();
  const arriveJob = useArriveTechnicianJob();
  const startJob = useStartTechnicianJob();

  const uploadProof = useUploadTechnicianProof();

  const completeJob = useCompleteTechnicianJob();

  const jobs = data?.jobs || [];

  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0]._id);
    }
  }, [jobs, selectedJobId]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job: any) => {
      const service = job.bookingId?.serviceType || "";
      const customer = job.bookingId?.customerId?.name || "";
      const phone = job.bookingId?.customerId?.phone || "";
      return `${service} ${customer} ${phone}`.toLowerCase().includes(q);
    });
  }, [jobs, search]);

  const selectedJob = useMemo(
    () => jobs.find((job: any) => job._id === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const recentJobs = useMemo(() => filteredJobs.slice(0, 4), [filteredJobs]);

  const stats = useMemo(() => {
    return {
      assigned: jobs.filter((j: any) =>
        ["assigned", "scheduled"].includes(j.status),
      ).length,
      active: jobs.filter((j: any) =>
        ["accepted", "arrived", "in_progress", "on_hold"].includes(j.status),
      ).length,
      completed: jobs.filter((j: any) => j.status === "completed").length,
      total: jobs.length,
    };
  }, [jobs]);

  async function onUploadProof() {
    if (!selectedJob) return;
    if (proofFiles.length === 0) return;

    try {
      const uploaded = await Promise.all(
        proofFiles.map((file) => uploadToCloudinary(file)),
      );

      const proofs = uploaded.map((item) => ({
        url: item.url,
        type: "photo",
        metadata: {
          public_id: item.public_id,
        },
      }));

      await uploadProof.mutateAsync({
        id: selectedJob._id,
        payload: {
          proofNote,
          proofs,
        },
      });

      setProofFiles([]);
      setProofNote("");
    } catch (err) {
      console.error("Upload error", err);
      alert("Upload failed");
    }
  }

  const progress = selectedJob
    ? Math.max(0, stepIndex(selectedJob.status) + 1)
    : 0;

  if (!session?.user) return <div>Loading...</div>;

  return (
    // <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
    //   <div className="mx-auto max-w-7xl space-y-6">
    //     <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
    //       <CardContent className="p-6 sm:p-8">
    //         <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    //           <div>
    //             <div className="text-sm text-slate-300">
    //               Technician workspace
    //             </div>
    //             <h1 className="mt-2 text-3xl font-semibold tracking-tight">
    //               My jobs, OTP, proof and completion
    //             </h1>
    //             <p className="mt-2 max-w-2xl text-sm text-slate-300">
    //               Follow each job step in order: accept, reach customer, verify
    //               OTP, upload proof, complete service.
    //             </p>
    //           </div>
    //           <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    //             <MiniStat label="Assigned" value={String(stats.assigned)} />
    //             <MiniStat label="Active" value={String(stats.active)} />
    //             <MiniStat label="Completed" value={String(stats.completed)} />
    //             <MiniStat label="Total" value={String(stats.total)} />
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
    //       <Card className="rounded-2xl border-slate-200 shadow-sm">
    //         <CardHeader>
    //           <CardTitle>Job List</CardTitle>
    //         </CardHeader>
    //         <CardContent className="space-y-3">
    //           {isLoading ? (
    //             <div className="text-sm text-slate-500">Loading jobs...</div>
    //           ) : jobs.length === 0 ? (
    //             <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
    //               No assigned jobs yet.
    //             </div>
    //           ) : (
    //             jobs.map((job: any) => {
    //               const customer = job.bookingId?.customerId;
    //               const active = selectedJobId === job._id;

    //               return (
    //                 <button
    //                   key={job._id}
    //                   onClick={() => setSelectedJobId(job._id)}
    //                   className={`w-full rounded-2xl border p-4 text-left transition ${
    //                     active
    //                       ? "border-slate-900 bg-slate-950 text-white"
    //                       : "border-slate-200 bg-white hover:bg-slate-50"
    //                   }`}
    //                 >
    //                   <div className="flex items-start justify-between gap-3">
    //                     <div>
    //                       <div className="font-medium">
    //                         {job.bookingId?.serviceType || "Service job"}
    //                       </div>
    //                       <div
    //                         className={`mt-1 text-sm ${active ? "text-slate-300" : "text-slate-500"}`}
    //                       >
    //                         {customer?.name || "Customer"} •{" "}
    //                         {customer?.phone || "-"}
    //                       </div>
    //                     </div>
    //                     <Badge
    //                       className={active ? "bg-white text-slate-950" : ""}
    //                     >
    //                       {job.status}
    //                     </Badge>
    //                   </div>

    //                   <div
    //                     className={`mt-3 text-xs ${active ? "text-slate-400" : "text-slate-500"}`}
    //                   >
    //                     Scheduled:{" "}
    //                     {job.scheduledAt
    //                       ? new Date(job.scheduledAt).toLocaleString()
    //                       : "-"}
    //                   </div>
    //                 </button>
    //               );
    //             })
    //           )}
    //         </CardContent>
    //       </Card>

    //       <Card className="rounded-2xl border-slate-200 shadow-sm">
    //         <CardHeader>
    //           <CardTitle>Job Workflow</CardTitle>
    //         </CardHeader>
    //         <CardContent>
    //           {!selectedJob ? (
    //             <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
    //               Select a job to continue.
    //             </div>
    //           ) : (
    //             <div className="space-y-5">
    //               <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //                 <div className="flex items-start justify-between gap-4">
    //                   <div>
    //                     <div className="text-lg font-semibold text-slate-900">
    //                       {selectedJob.bookingId?.serviceType || "Service job"}
    //                     </div>
    //                     <div className="mt-1 text-sm text-slate-600">
    //                       {selectedJob.bookingId?.customerId?.name ||
    //                         "Customer"}{" "}
    //                       • {selectedJob.bookingId?.customerId?.phone || "-"}
    //                     </div>
    //                     <div className="mt-1 text-sm text-slate-500">
    //                       {selectedJob.bookingId?.customerId?.addresses?.[0]
    //                         ?.addressLine ||
    //                         selectedJob.bookingId?.address?.addressLine ||
    //                         "Address not added yet"}
    //                     </div>
    //                   </div>
    //                   <Badge>{selectedJob.status}</Badge>
    //                 </div>

    //                 <Separator className="my-4" />

    //                 <div className="grid gap-3 sm:grid-cols-2">
    //                   <InfoBox
    //                     label="OTP"
    //                     value={selectedJob.otp ? "Generated" : "Not generated"}
    //                   />
    //                   <InfoBox
    //                     label="Start"
    //                     value={
    //                       selectedJob.startTime
    //                         ? new Date(selectedJob.startTime).toLocaleString()
    //                         : "-"
    //                     }
    //                   />
    //                   <InfoBox
    //                     label="Arrived"
    //                     value={
    //                       selectedJob.arrivedAt
    //                         ? new Date(selectedJob.arrivedAt).toLocaleString()
    //                         : "-"
    //                     }
    //                   />
    //                   <InfoBox
    //                     label="Completed"
    //                     value={
    //                       selectedJob.endTime
    //                         ? new Date(selectedJob.endTime).toLocaleString()
    //                         : "-"
    //                     }
    //                   />
    //                 </div>
    //               </div>

    //               <div className="grid gap-2 sm:grid-cols-5">
    //                 {[
    //                   { label: "Assigned", done: true },
    //                   {
    //                     label: "enroute",
    //                     done: stepIndex(selectedJob.status) >= 1,
    //                   },
    //                   {
    //                     label: "Reached",
    //                     done: stepIndex(selectedJob.status) >= 2,
    //                   },
    //                   {
    //                     label: "Started",
    //                     done: stepIndex(selectedJob.status) >= 3,
    //                   },
    //                   {
    //                     label: "Completed",
    //                     done: stepIndex(selectedJob.status) >= 4,
    //                   },
    //                 ].map((step) => (
    //                   <div
    //                     key={step.label}
    //                     className={`rounded-2xl border p-3 text-center ${
    //                       step.done
    //                         ? "border-emerald-200 bg-emerald-50"
    //                         : "border-slate-200 bg-white"
    //                     }`}
    //                   >
    //                     <div
    //                       className={`text-sm font-medium ${step.done ? "text-emerald-700" : "text-slate-600"}`}
    //                     >
    //                       {step.label}
    //                     </div>
    //                   </div>
    //                 ))}
    //               </div>

    //               <div className="grid gap-3 sm:grid-cols-2">
    //                 <Button
    //                   className="rounded-2xl"
    //                   onClick={() => acceptJob.mutate(selectedJob._id)}
    //                   disabled={
    //                     !["assigned", "scheduled"].includes(
    //                       selectedJob.status,
    //                     ) || acceptJob.isPending
    //                   }
    //                 >
    //                   Accept Job
    //                 </Button>

    //                 <Button
    //                   variant="outline"
    //                   className="rounded-2xl"
    //                   onClick={() => arriveJob.mutate(selectedJob._id)}
    //                   disabled={
    //                     selectedJob.status !== "enroute" || arriveJob.isPending
    //                   }
    //                 >
    //                   Reach Customer
    //                 </Button>
    //               </div>

    //               <div className="rounded-2xl border border-slate-200 p-4">
    //                 <div className="text-sm font-medium text-slate-900">
    //                   Start with OTP
    //                 </div>
    //                 <div className="mt-3 flex flex-col gap-3 sm:flex-row">
    //                   <Input
    //                     value={otp}
    //                     onChange={(e) => setOtp(e.target.value)}
    //                     placeholder="Enter OTP"
    //                     className="rounded-2xl"
    //                     disabled={selectedJob.status !== "arrived"}
    //                   />
    //                   <Button
    //                     className="rounded-2xl"
    //                     onClick={() =>
    //                       startJob.mutate({ id: selectedJob._id, otp })
    //                     }
    //                     disabled={
    //                       selectedJob.status !== "arrived" || startJob.isPending
    //                     }
    //                   >
    //                     Verify OTP & Start
    //                   </Button>
    //                 </div>
    //               </div>

    //               <div className="rounded-2xl border border-slate-200 p-4">
    //                 <div className="text-sm font-medium text-slate-900">
    //                   Upload Proof
    //                 </div>
    //                 <p className="mt-1 text-xs text-slate-500">
    //                   You can connect Cloudinary next. For now the files are
    //                   converted to data URLs so the flow works end-to-end.
    //                 </p>

    //                 <div className="mt-3 space-y-3">
    //                   <Textarea
    //                     value={proofNote}
    //                     onChange={(e) => setProofNote(e.target.value)}
    //                     placeholder="Job proof note"
    //                     className="rounded-2xl"
    //                   />

    //                   <Input
    //                     type="file"
    //                     multiple
    //                     accept="image/*"
    //                     onChange={(e) =>
    //                       setProofFiles(Array.from(e.target.files || []))
    //                     }
    //                     className="rounded-2xl"
    //                   />

    //                   <Button
    //                     className="rounded-2xl"
    //                     onClick={onUploadProof}
    //                     disabled={
    //                       proofFiles.length === 0 || uploadProof.isPending
    //                     }
    //                   >
    //                     Upload Proof
    //                   </Button>
    //                 </div>
    //               </div>

    //               <div className="flex gap-3">
    //                 <Button
    //                   className="rounded-2xl"
    //                   onClick={() => completeJob.mutate(selectedJob._id)}
    //                   disabled={
    //                     selectedJob.status !== "in_progress" ||
    //                     completeJob.isPending
    //                   }
    //                 >
    //                   Complete Job
    //                 </Button>
    //               </div>
    //               {/* <div>
    //                 <CollectPaymentActions
    //                   invoiceId={selectedJob.invoiceId}
    //                   customerName={selectedJob.customerName}
    //                   customerPhone={selectedJob.customerPhone}
    //                   customerEmail={selectedJob.customerEmail}
    //                   amount={selectedJob.amount}
    //                 />
    //               </div> */}
    //               <div>
    //                 {selectedJob.invoiceId ? (
    //                   <CollectPaymentActions
    //                     invoiceId={selectedJob.invoiceId}
    //                     customerName={selectedJob.customerName}
    //                     customerPhone={selectedJob.customerPhone}
    //                     customerEmail={selectedJob.customerEmail}
    //                     amount={selectedJob.amount}
    //                   />
    //                 ) : (
    //                   <p className="text-sm text-red-500">
    //                     No invoice found. Please contact admin.
    //                   </p>
    //                 )}
    //               </div>

    //               <div>
    //                 {selectedJob ? (
    //                   <JobChatPanel
    //                     jobId={selectedJob._id}
    //                     currentUserId={session.user.id}
    //                     currentUserRole={session.user.role}
    //                     currentUserName={session.user.name}
    //                   />
    //                 ) : null}
    //               </div>

    //               <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
    //                 <div className="font-medium text-slate-900">
    //                   Customer / service notes
    //                 </div>
    //                 <p className="mt-2">
    //                   {selectedJob.notes || "No notes added for this job."}
    //                 </p>
    //               </div>
    //             </div>
    //           )}
    //         </CardContent>
    //       </Card>
    //     </div>
    //   </div>
    //   {jobs.map((job: any) => {
    //     const active = selectedJob === job._id;

    //     return (
    //       <ChatBtn
    //         key={job._id}
    //         job={job}
    //         active={active}
    //         onSelect={setSelectedJobId}
    //       />
    //     );
    //   })}
    // </div>
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-emerald-50/40 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero */}
        <Card className="overflow-hidden border-0 shadow-xl shadow-emerald-500/10">
          <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-500 px-6 py-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
                  <Sparkles className="h-3.5 w-3.5" />
                  Technician workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  My jobs, OTP, proof, and completion
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Track each job from assignment to completion. Open a job,
                  accept it, reach the customer, verify OTP, upload proof, and
                  finish the service.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat
                  label="Assigned"
                  value={String(stats.assigned)}
                  icon={ClipboardList}
                />
                <MiniStat
                  label="Active"
                  value={String(stats.active)}
                  icon={CircleDot}
                />
                <MiniStat
                  label="Completed"
                  value={String(stats.completed)}
                  icon={CheckCircle2}
                />
                <MiniStat
                  label="Total"
                  value={String(stats.total)}
                  icon={Wrench}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          {/* Left: jobs list */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-emerald-50/40">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                      Recent Jobs
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      Open any job to continue the workflow
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    asChild
                  >
                    <Link href="/technician/jobs">
                      View all jobs
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search service, customer, or phone..."
                    className="h-11 rounded-2xl border-slate-200 bg-white pl-10 shadow-sm"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-4">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Loading jobs...
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No assigned jobs yet.
                </div>
              ) : (
                recentJobs.map((job: any) => {
                  const customer = job.bookingId?.customerId;
                  const active = selectedJobId === job._id;

                  return (
                    <button
                      key={job._id}
                      onClick={() => setSelectedJobId(job._id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-emerald-300 bg-emerald-50 shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {job.bookingId?.serviceType || "Service job"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {customer?.name || "Customer"} •{" "}
                            {customer?.phone || "-"}
                          </div>
                        </div>
                        {statusBadge(job.status)}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {job.scheduledAt
                            ? new Date(job.scheduledAt).toLocaleString()
                            : "-"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.bookingId?.address?.city || "No city"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}

              <Separator className="my-3" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-900">
                    All jobs
                  </div>
                  <button
                    onClick={() => router.push("/technician/jobs")}
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Open job list
                  </button>
                </div>

                <div className="grid gap-2">
                  {filteredJobs.slice(0, 8).map((job: any) => (
                    <button
                      key={job._id}
                      onClick={() => router.push("/technician/jobs")}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {job.bookingId?.serviceType || "Service job"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {job.bookingId?.customerId?.name || "Customer"}
                        </div>
                      </div>
                      <div className="text-right">
                        {statusBadge(job.status)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: workflow */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-linear-to-r from-white to-emerald-50/40">
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Job Workflow
              </CardTitle>
              <p className="text-sm text-slate-500">
                Select a job to continue the service flow
              </p>
            </CardHeader>

            <CardContent className="p-4">
              {!selectedJob ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  Select a job from the list to start working.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">
                          {selectedJob.bookingId?.serviceType || "Service job"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {selectedJob.bookingId?.customerId?.name ||
                            "Customer"}{" "}
                          • {selectedJob.bookingId?.customerId?.phone || "-"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {selectedJob.bookingId?.address?.addressLine ||
                            selectedJob.bookingId?.customerId?.addresses?.[0]
                              ?.addressLine ||
                            "Address not added yet"}
                        </div>
                      </div>
                      {statusBadge(selectedJob.status)}
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoBox
                        label="OTP"
                        value={selectedJob.otp ? "Generated" : "Not generated"}
                      />
                      <InfoBox
                        label="Start"
                        value={
                          selectedJob.startTime
                            ? new Date(selectedJob.startTime).toLocaleString()
                            : "-"
                        }
                      />
                      <InfoBox
                        label="Arrived"
                        value={
                          selectedJob.arrivedAt
                            ? new Date(selectedJob.arrivedAt).toLocaleString()
                            : "-"
                        }
                      />
                      <InfoBox
                        label="Completed"
                        value={
                          selectedJob.endTime
                            ? new Date(selectedJob.endTime).toLocaleString()
                            : "-"
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-5">
                    {[
                      { label: "Assigned", done: true },
                      {
                        label: "Enroute",
                        done: stepIndex(selectedJob.status) >= 1,
                      },
                      {
                        label: "Reached",
                        done: stepIndex(selectedJob.status) >= 2,
                      },
                      {
                        label: "Started",
                        done: stepIndex(selectedJob.status) >= 3,
                      },
                      {
                        label: "Completed",
                        done: stepIndex(selectedJob.status) >= 4,
                      },
                    ].map((step) => (
                      <div
                        key={step.label}
                        className={`rounded-2xl border p-3 text-center ${
                          step.done
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div
                          className={`text-sm font-medium ${
                            step.done ? "text-emerald-700" : "text-slate-600"
                          }`}
                        >
                          {step.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      className="h-11 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                      onClick={() => acceptJob.mutate(selectedJob._id)}
                      disabled={
                        !["assigned", "scheduled"].includes(
                          selectedJob.status,
                        ) || acceptJob.isPending
                      }
                    >
                      Accept Job
                    </Button>

                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                      onClick={() => arriveJob.mutate(selectedJob._id)}
                      disabled={
                        selectedJob.status !== "enroute" || arriveJob.isPending
                      }
                    >
                      Reach Customer
                    </Button>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-medium text-slate-900">
                      Start with OTP
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter OTP"
                        className="h-11 rounded-2xl"
                        disabled={selectedJob.status !== "arrived"}
                      />
                      <Button
                        className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                        onClick={() =>
                          startJob.mutate({ id: selectedJob._id, otp })
                        }
                        disabled={
                          selectedJob.status !== "arrived" || startJob.isPending
                        }
                      >
                        Verify OTP & Start
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-medium text-slate-900">
                      Upload Proof
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Add photos or notes after the job is done.
                    </p>

                    <div className="mt-3 space-y-3">
                      <Textarea
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                        placeholder="Job proof note"
                        className="min-h-24 rounded-2xl"
                      />

                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) =>
                          setProofFiles(Array.from(e.target.files || []))
                        }
                        className="rounded-2xl"
                      />

                      <Button
                        className="h-11 rounded-2xl bg-linear-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-700 hover:to-emerald-700"
                        onClick={onUploadProof}
                        disabled={
                          proofFiles.length === 0 || uploadProof.isPending
                        }
                      >
                        <FileImage className="mr-2 h-4 w-4" />
                        Upload Proof
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="h-11 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                      onClick={() => completeJob.mutate(selectedJob._id)}
                      disabled={
                        selectedJob.status !== "in_progress" ||
                        completeJob.isPending
                      }
                    >
                      Complete Job
                    </Button>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">
                      Customer / service notes
                    </div>
                    <p className="mt-2">
                      {selectedJob.notes || "No notes added for this job."}
                    </p>
                  </div>
                  <div>
                    {selectedJob ? (
                      <JobChatPanel
                        jobId={selectedJob._id}
                        currentUserId={session.user.id}
                        currentUserRole={session.user.role}
                        currentUserName={session.user.name}
                        triggerLabel="Chat with user"
                      />
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* <div>
        {filteredJobs.map((job: any) => (
          <ChatBtn
            key={job._id}
            job={job}
            active={selectedJobId === job._id}
            onSelect={(id: string) => {
              setSelectedJobId(id);
              router.push("/technician/jobs");
            }}
          />
        ))}
      </div> */}
      {/* {filteredJobs.map((job: any) => {
        const active = selectedJob === job._id;

        return (
          <ChatBtn
            key={job._id}
            job={job}
            active={active}
            onSelect={setSelectedJobId}
          />
        );
      })} */}
    </div>
  );
}

// function MiniStat({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
//       <div className="text-xl font-semibold">{value}</div>
//       <div className="text-xs text-slate-300">{label}</div>
//     </div>
//   );
// }

// function InfoBox({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white p-3">
//       <div className="text-xs text-slate-500">{label}</div>
//       <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
//     </div>
//   );
// }

export default TechDash;
