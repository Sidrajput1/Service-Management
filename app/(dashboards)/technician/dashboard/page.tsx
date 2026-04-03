"use client";



import CollectPaymentActions from "@/components/payments/CollectPaymentActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAcceptTechnicianJob, useArriveTechnicianJob, useCompleteTechnicianJob, useStartTechnicianJob, useTechnicianJobs, useUploadTechnicianProof } from "@/hooks/useTechnicianJobs";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { CheckCircle2, ClipboardList, Clock3, Home, MapPinned, ShieldCheck, Smartphone, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";



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

const statusOrder = [
  "assigned",
  //"accepted", // skipping accepted as it's a quick transition and doesn't have much UI impact
  "enroute",
  "arrived",
  "in_progress",
  "completed"
] as const;

function stepIndex(status:string){
  return statusOrder.indexOf(status as any);
}

async function filteToDataUrl(file:File){
  return await new Promise<string>((res,rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result));
    reader.onerror = rej;
    reader.readAsDataURL(file);
  })
}


function TechnicianDashboard() {

  const {data,isLoading} = useTechnicianJobs();

  const [selectedJobId,setSelectedJobId] = useState<string>("");
  const [otp,setOtp] = useState("");
  const [proofNote,setProofNote] = useState("");

  const [proofFiles,setProofFiles] = useState<File[]>([]);

  const acceptJob = useAcceptTechnicianJob();
  const arriveJob = useArriveTechnicianJob();
  const startJob = useStartTechnicianJob();

  const uploadProof = useUploadTechnicianProof();

  const completeJob = useCompleteTechnicianJob();

  const jobs = data?.jobs || [];

  useEffect(() => {
    if(!selectedJobId && jobs.length > 0){
      setSelectedJobId(jobs[0]._id);
    }
  },[jobs,selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job: any) => job._id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const stats = useMemo(() => {
    return {
      assigned: jobs.filter((j: any) => ["assigned", "scheduled"].includes(j.status)).length,
      active: jobs.filter((j: any) => ["accepted", "arrived", "in_progress", "on_hold"].includes(j.status)).length,
      completed: jobs.filter((j: any) => j.status === "completed").length,
      total: jobs.length,
    };
  }, [jobs]);

  // async function onUploadProof() {
  //   if (!selectedJob) return;
  //   if (proofFiles.length === 0) return;

  //   const proofs = await Promise.all(
  //     proofFiles.map(async (file) => ({
  //       url: await filteToDataUrl(file),
  //       type: "photo" as const,
  //       metadata: {
  //         fileName: file.name,
  //         size: file.size,
  //         type: file.type,
  //       },
  //     }))
  //   );

  //   await uploadProof.mutateAsync({
  //     id: selectedJob._id,
  //     payload: { proofNote, proofs },
  //   });

  //   setProofFiles([]);
  //   setProofNote("");
  // }

  async function onUploadProof() {
  if (!selectedJob) return;
  if (proofFiles.length === 0) return;

  try {
    const uploaded = await Promise.all(
      proofFiles.map((file) => uploadToCloudinary(file))
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

  

  const progress = selectedJob ? Math.max(0, stepIndex(selectedJob.status) + 1) : 0;
  return (
    // <div className="space-y-6">
    //   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    //     {technicianStats.map((stat) => (
    //       <StatCard key={stat.label} {...stat} />
    //     ))}
    //   </div>

    //   <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
    //     <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
    //       <CardHeader>
    //         <CardTitle className="text-lg">Today’s Route</CardTitle>
    //         <p className="text-sm text-slate-500">Your active service movement</p>
    //       </CardHeader>
    //       <CardContent className="space-y-4">
    //         {[
    //           { label: "Start point", value: "Home Base", icon: Home },
    //           { label: "Next stop", value: "Sharma Residence", icon: MapPinned },
    //           { label: "ETA", value: "18 mins", icon: Clock3 },
    //           { label: "OTP status", value: "Pending", icon: ShieldCheck },
    //         ].map((item) => {
    //           const Icon = item.icon;
    //           return (
    //             <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    //               <div className="flex items-center gap-3">
    //                 <div className="rounded-2xl bg-white p-2 shadow-sm">
    //                   <Icon className="h-4 w-4 text-slate-700" />
    //                 </div>
    //                 <div>
    //                   <div className="text-sm font-medium text-slate-900">{item.label}</div>
    //                   <div className="text-xs text-slate-500">Field update</div>
    //                 </div>
    //               </div>
    //               <div className="text-sm font-semibold text-slate-900">{item.value}</div>
    //             </div>
    //           );
    //         })}
    //       </CardContent>
    //     </Card>

    //     <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
    //       <CardHeader>
    //         <CardTitle className="text-lg">My Jobs</CardTitle>
    //         <p className="text-sm text-slate-500">Assigned work and current progress</p>
    //       </CardHeader>
    //       <CardContent className="space-y-3">
    //         {techJobs.map((job) => (
    //           <div key={job.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    //             <div className="flex items-start justify-between gap-3">
    //               <div>
    //                 <div className="font-medium text-slate-900">{job.name}</div>
    //                 <div className="mt-1 text-sm text-slate-500">Scheduled: {job.time}</div>
    //               </div>
    //               <Badge variant="outline" className={job.badge}>
    //                 {job.status}
    //               </Badge>
    //             </div>
    //             <div className="mt-4 flex flex-wrap gap-2">
    //               <Button size="sm" className="rounded-xl">
    //                 Start Job
    //               </Button>
    //               <Button size="sm" variant="outline" className="rounded-xl">
    //                 Upload Proof
    //               </Button>
    //               <Button size="sm" variant="ghost" className="rounded-xl">
    //                 Details
    //               </Button>
    //             </div>
    //           </div>
    //         ))}
    //       </CardContent>
    //     </Card>
    //   </div>

    //   <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
    //     <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
    //       <CardHeader>
    //         <CardTitle className="text-lg">Technician Features</CardTitle>
    //         <p className="text-sm text-slate-500">What the field app should support</p>
    //       </CardHeader>
    //       <CardContent className="grid gap-3 md:grid-cols-2">
    //         {[
    //           "Job list and acceptance",
    //           "OTP based job start",
    //           "Live GPS tracking",
    //           "Photo / proof upload",
    //           "Work notes and checklist",
    //           "Parts used entry",
    //           "Completion confirmation",
    //           "Daily earnings and history",
    //         ].map((item) => (
    //           <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    //             <Smartphone className="h-4 w-4 text-slate-700" />
    //             <span className="text-sm font-medium text-slate-800">{item}</span>
    //           </div>
    //         ))}
    //       </CardContent>
    //     </Card>

    //     <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
    //       <CardHeader>
    //         <CardTitle className="text-lg">Today’s Availability</CardTitle>
    //         <p className="text-sm text-slate-500">Shift and workload view</p>
    //       </CardHeader>
    //       <CardContent className="space-y-4">
    //         <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    //           <div className="flex items-center justify-between">
    //             <div>
    //               <div className="text-sm font-medium text-slate-900">Shift Status</div>
    //               <div className="text-xs text-slate-500">Active until 8:00 PM</div>
    //             </div>
    //             <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">Available</Badge>
    //           </div>
    //           <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
    //             <div className="h-full w-[72%] rounded-full bg-slate-900" />
    //           </div>
    //         </div>

    //         <div className="grid gap-3 md:grid-cols-2">
    //           {[
    //             { label: "Completed", value: "5" },
    //             { label: "Pending", value: "3" },
    //             { label: "Cancelled", value: "1" },
    //             { label: "Rating", value: "4.8" },
    //           ].map((item) => (
    //             <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
    //               <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
    //               <div className="mt-1 text-sm text-slate-500">{item.label}</div>
    //             </div>
    //           ))}
    //         </div>
    //       </CardContent>
    //     </Card>
    //   </div>
    // </div>
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm text-slate-300">Technician workspace</div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">My jobs, OTP, proof and completion</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Follow each job step in order: accept, reach customer, verify OTP, upload proof, complete service.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Assigned" value={String(stats.assigned)} />
                <MiniStat label="Active" value={String(stats.active)} />
                <MiniStat label="Completed" value={String(stats.completed)} />
                <MiniStat label="Total" value={String(stats.total)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Job List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-sm text-slate-500">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                  No assigned jobs yet.
                </div>
              ) : (
                jobs.map((job: any) => {
                  const customer = job.bookingId?.customerId;
                  const active = selectedJobId === job._id;

                  return (
                    <button
                      key={job._id}
                      onClick={() => setSelectedJobId(job._id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{job.bookingId?.serviceType || "Service job"}</div>
                          <div className={`mt-1 text-sm ${active ? "text-slate-300" : "text-slate-500"}`}>
                            {customer?.name || "Customer"} • {customer?.phone || "-"}
                          </div>
                        </div>
                        <Badge className={active ? "bg-white text-slate-950" : ""}>{job.status}</Badge>
                      </div>

                      <div className={`mt-3 text-xs ${active ? "text-slate-400" : "text-slate-500"}`}>
                        Scheduled: {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : "-"}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Job Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedJob ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                  Select a job to continue.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">
                          {selectedJob.bookingId?.serviceType || "Service job"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {selectedJob.bookingId?.customerId?.name || "Customer"} •{" "}
                          {selectedJob.bookingId?.customerId?.phone || "-"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {selectedJob.bookingId?.customerId?.addresses?.[0]?.addressLine ||
                            selectedJob.bookingId?.address?.addressLine ||
                            "Address not added yet"}
                        </div>
                      </div>
                      <Badge>{selectedJob.status}</Badge>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoBox label="OTP" value={selectedJob.otp ? "Generated" : "Not generated"} />
                      <InfoBox label="Start" value={selectedJob.startTime ? new Date(selectedJob.startTime).toLocaleString() : "-"} />
                      <InfoBox label="Arrived" value={selectedJob.arrivedAt ? new Date(selectedJob.arrivedAt).toLocaleString() : "-"} />
                      <InfoBox label="Completed" value={selectedJob.endTime ? new Date(selectedJob.endTime).toLocaleString() : "-"} />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-5">
                    {[
                      { label: "Assigned", done: true },
                      { label: "enroute", done: stepIndex(selectedJob.status) >= 1 },
                      { label: "Reached", done: stepIndex(selectedJob.status) >= 2 },
                      { label: "Started", done: stepIndex(selectedJob.status) >= 3 },
                      { label: "Completed", done: stepIndex(selectedJob.status) >= 4 },
                    ].map((step) => (
                      <div
                        key={step.label}
                        className={`rounded-2xl border p-3 text-center ${
                          step.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className={`text-sm font-medium ${step.done ? "text-emerald-700" : "text-slate-600"}`}>
                          {step.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      className="rounded-2xl"
                      onClick={() => acceptJob.mutate(selectedJob._id)}
                      disabled={!["assigned", "scheduled"].includes(selectedJob.status) || acceptJob.isPending}
                    >
                      Accept Job
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => arriveJob.mutate(selectedJob._id)}
                      disabled={selectedJob.status !== "enroute" || arriveJob.isPending}
                    >
                      Reach Customer
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-900">Start with OTP</div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter OTP"
                        className="rounded-2xl"
                        disabled={selectedJob.status !== "arrived"}
                      />
                      <Button
                        className="rounded-2xl"
                        onClick={() => startJob.mutate({ id: selectedJob._id, otp })}
                        disabled={selectedJob.status !== "arrived" || startJob.isPending}
                      >
                        Verify OTP & Start
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-900">Upload Proof</div>
                    <p className="mt-1 text-xs text-slate-500">
                      You can connect Cloudinary next. For now the files are converted to data URLs so the flow works end-to-end.
                    </p>

                    <div className="mt-3 space-y-3">
                      <Textarea
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                        placeholder="Job proof note"
                        className="rounded-2xl"
                      />

                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setProofFiles(Array.from(e.target.files || []))}
                        className="rounded-2xl"
                      />

                      <Button
                        className="rounded-2xl"
                        onClick={onUploadProof}
                        disabled={proofFiles.length === 0 || uploadProof.isPending}
                      >
                        Upload Proof
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="rounded-2xl"
                      onClick={() => completeJob.mutate(selectedJob._id)}
                      disabled={selectedJob.status !== "in_progress" || completeJob.isPending}
                    >
                      Complete Job
                    </Button>
                  </div>
                  <div>
                    <CollectPaymentActions
                      invoiceId={selectedJob.invoiceId}
                      customerName={selectedJob.customerName}
                      customerPhone={selectedJob.customerPhone}
                      customerEmail={selectedJob.customerEmail}
                      amount={selectedJob.amount}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">Customer / service notes</div>
                    <p className="mt-2">
                      {selectedJob.notes || "No notes added for this job."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
 
  );
};

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-slate-300">{label}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default TechnicianDashboard;
