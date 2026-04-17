"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/hooks/useUsers";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  PencilLine,
  Wrench,
  Users2,
} from "lucide-react";
import { toast } from "sonner";

const TechnicianSchema = z.object({
  mode: z.enum(["new", "existing"]),
  userId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  skillsText: z.string().min(1, "Enter at least one skill"),
  vehicleType: z.string().optional(),
});

type FormValues = z.infer<typeof TechnicianSchema>;

function statusBadge(status?: string) {
  const s = (status || "inactive").toLowerCase();

  if (s.includes("active")) {
    return <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Active</Badge>;
  }
  if (s.includes("busy")) {
    return <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">Busy</Badge>;
  }
  if (s.includes("offline")) {
    return <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">Offline</Badge>;
  }

  return <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">{status || "New"}</Badge>;
}

function StatCard({
  title,
  value,
  icon: Icon,
  note,
  accentClassName,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  note: string;
  accentClassName: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data } = await axios.get("/api/add-technicians");
      return data;
    },
  });
}

// export default function AdminTechniciansPage() {
//   const qc = useQueryClient();
//   const [serverMsg, setServerMsg] = useState<string | null>(null);
//   const [tempPassword, setTempPassword] = useState<string | null>(null);
//   const [mode, setMode] = useState<"new" | "existing">("new");

//   const { data: techniciansData, isLoading } = useTechnicians();

//   //console.log("Technicians:", techniciansData.users);
//   const { data: usersData } = useUsers();

//   const filteredUsers = useMemo(() => {
//     const users = usersData?.users || [];
//     return users.filter((u: any) => u.role !== "technician" && u.role !== "admin");
//   }, [usersData]);

//   const {
//     register,
//     handleSubmit,
//     reset,
//     formState: { errors, isSubmitting },
//   } = useForm<FormValues>({
//     resolver: zodResolver(TechnicianSchema),
//     defaultValues: {
//       mode: "new",
//       skillsText: "",
//       vehicleType: "",
//     },
//   });

//   async function onSubmit(values: FormValues) {
//     setServerMsg(null);
//     setTempPassword(null);

//     try {
//       const payload: any = {
//         mode,
//         skills: values.skillsText
//           .split(",")
//           .map((s) => s.trim())
//           .filter(Boolean),
//         vehicleType: values.vehicleType || undefined,
//       };

//       if (mode === "new") {
//         payload.name = values.name;
//         payload.email = values.email;
//         payload.phone = values.phone;
//         payload.password = values.password;
//       } else {
//         payload.userId = values.userId;
//       }

//       const { data } = await axios.post("/api/add-technicians", payload);

//       setServerMsg("Technician created successfully.");
//       if (data?.tempPassword) {
//         setTempPassword(data.tempPassword);
//       }

//       reset({
//         mode: "new",
//         skillsText: "",
//         vehicleType: "",
//       });

//       setMode("new");
//       qc.invalidateQueries({ queryKey: ["technicians"] });
//       qc.invalidateQueries({ queryKey: ["users"] });
//     } catch (err: any) {
//       setServerMsg(err?.response?.data?.error || err.message || "Something went wrong");
//     }
//   }

//   return (
//     <div className="min-h-screen bg-slate-100 p-6">
//       <div className="mx-auto max-w-7xl space-y-6">
//         <Card className="rounded-3xl border-slate-200 shadow-sm">
//           <CardHeader>
//             <CardTitle>Add Technician</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-5">
//             {serverMsg && <Alert>{serverMsg}</Alert>}
//             {tempPassword && (
//               <Alert>
//                 Temporary password: <strong>{tempPassword}</strong>
//               </Alert>
//             )}

//             <div className="flex gap-2">
//               <Button
//                 type="button"
//                 variant={mode === "new" ? "default" : "outline"}
//                 onClick={() => setMode("new")}
//               >
//                 Create New Technician
//               </Button>
//               <Button
//                 type="button"
//                 variant={mode === "existing" ? "default" : "outline"}
//                 onClick={() => setMode("existing")}
//               >
//                 Use Existing User
//               </Button>
//             </div>

//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               {mode === "new" ? (
//                 <div className="grid gap-4 md:grid-cols-2">
//                   <div>
//                     <Label>Name</Label>
//                     <Input {...register("name")} placeholder="Technician name" />
//                     {errors.name && (
//                       <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
//                     )}
//                   </div>

//                   <div>
//                     <Label>Email</Label>
//                     <Input {...register("email")} placeholder="tech@example.com" />
//                     {errors.email && (
//                       <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
//                     )}
//                   </div>

//                   <div>
//                     <Label>Phone</Label>
//                     <Input {...register("phone")} placeholder="+91xxxxxxxxxx" />
//                   </div>

//                   <div>
//                     <Label>Initial Password</Label>
//                     <Input {...register("password")} placeholder="Optional, leave blank to auto-generate" />
//                   </div>
//                 </div>
//               ) : (
//                 <div>
//                   <Label>Select Existing User</Label>
//                   <select
//                     {...register("userId")}
//                     className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
//                   >
//                     <option value="">Choose user</option>
//                     {filteredUsers.map((u: any) => (
//                       <option key={u._id} value={u._id}>
//                         {u.name} — {u.email || u.phone || "no contact"}
//                       </option>
//                     ))}
//                   </select>
//                   {errors.userId && (
//                     <p className="mt-1 text-sm text-red-500">{errors.userId.message}</p>
//                   )}
//                 </div>
//               )}

//               <div>
//                 <Label>Skills</Label>
//                 <Input
//                   {...register("skillsText")}
//                   placeholder="AC, plumbing, electrical"
//                 />
//                 <p className="mt-1 text-xs text-slate-500">
//                   Separate skills with commas.
//                 </p>
//                 {errors.skillsText && (
//                   <p className="mt-1 text-sm text-red-500">{errors.skillsText.message}</p>
//                 )}
//               </div>

//               <div>
//                 <Label>Vehicle Type</Label>
//                 <Input {...register("vehicleType")} placeholder="Bike / Scooter / Van" />
//               </div>

//               <div className="flex gap-2">
//                 <Button type="submit" disabled={isSubmitting} >
//                   {isSubmitting ? "Saving..." : "Add Technician"}
//                 </Button>
//                 <Button
//                   type="button"
//                   variant="outline"
//                   onClick={() => reset()}
//                 >
//                   Reset
//                 </Button>
//               </div>
//             </form>
//           </CardContent>
//         </Card>

//         <Card className="rounded-3xl border-slate-200 shadow-sm">
//           <CardHeader>
//             <CardTitle>Technicians</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Email / Phone</TableHead>
//                     <TableHead>Skills</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Jobs</TableHead>
//                     <TableHead>Rating</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {isLoading ? (
//                     <TableRow>
//                       <TableCell colSpan={6}>Loading...</TableCell>
//                     </TableRow>
//                   ) : (
//                     (techniciansData?.technicians || []).map((tech: any) => (
//                       <TableRow key={tech._id}>
//                         <TableCell className="font-medium">
//                           {tech.userId?.name || "-"}
//                         </TableCell>
//                         <TableCell>
//                           <div>{tech.userId?.email || "-"}</div>
//                           <div className="text-xs text-slate-500">{tech.userId?.phone || "-"}</div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="flex flex-wrap gap-2">
//                             {(tech.skills || []).map((skill: string) => (
//                               <Badge key={skill} variant="secondary">
//                                 {skill}
//                               </Badge>
//                             ))}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <Badge>{tech.status}</Badge>
//                         </TableCell>
//                         <TableCell>{tech.jobsCompleted || 0}</TableCell>
//                         <TableCell>{tech.rating || 0}</TableCell>
//                       </TableRow>
//                     ))
//                   )}
//                 </TableBody>
//               </Table>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

export default function AdminTechniciansPage() {
  const qc = useQueryClient();

  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [mode, setMode] = useState<"new" | "existing">("new");

  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any | null>(null);

  const { data: techniciansData, isLoading } = useTechnicians();
  const { data: usersData } = useUsers();

  const filteredUsers = useMemo(() => {
    const users = usersData?.users || [];
    return users.filter((u: any) => u.role !== "technician" && u.role !== "admin");
  }, [usersData]);

  const filteredTechnicians = useMemo(() => {
    const technicians = techniciansData?.technicians || [];
    const q = search.trim().toLowerCase();

    if (!q) return technicians;

    return technicians.filter((tech: any) => {
      const name = tech.userId?.name || "";
      const email = tech.userId?.email || "";
      const phone = tech.userId?.phone || "";
      const skills = (tech.skills || []).join(" ");
      return `${name} ${email} ${phone} ${skills}`.toLowerCase().includes(q);
    });
  }, [techniciansData, search]);

  const stats = useMemo(() => {
    const technicians = techniciansData?.technicians || [];
    const total = technicians.length;
    const active = technicians.filter((t: any) => (t.status || "").toLowerCase().includes("active")).length;
    const busy = technicians.filter((t: any) => (t.status || "").toLowerCase().includes("busy")).length;
    const avgRating =
      total > 0
        ? (
            technicians.reduce((sum: number, t: any) => sum + Number(t.rating || 0), 0) / total
          ).toFixed(1)
        : "0.0";

    return { total, active, busy, avgRating };
  }, [techniciansData]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(TechnicianSchema),
    defaultValues: {
      mode: "new",
      skillsText: "",
      vehicleType: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerMsg(null);
    setTempPassword(null);

    try {
      const payload: any = {
        mode,
        skills: values.skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        vehicleType: values.vehicleType || undefined,
      };

      if (mode === "new") {
        payload.name = values.name;
        payload.email = values.email;
        payload.phone = values.phone;
        payload.password = values.password;
      } else {
        payload.userId = values.userId;
      }

      const { data } = await axios.post("/api/add-technicians", payload);

      setServerMsg("Technician created successfully.");
      toast.success("Technician added successfully");

      if (data?.tempPassword) {
        setTempPassword(data.tempPassword);
      }

      reset({
        mode: "new",
        skillsText: "",
        vehicleType: "",
      });

      setMode("new");
      qc.invalidateQueries({ queryKey: ["technicians"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || "Something went wrong";
      setServerMsg(msg);
      toast.error(msg);
    }
  }

  function openEditDialog(tech: any) {
    setSelectedTechnician(tech);
    setEditDialogOpen(true);
  }

  function openDeleteDialog(tech: any) {
    setSelectedTechnician(tech);
    setDeleteDialogOpen(true);
  }

  async function handleUpdateTechnician() {
    if (!selectedTechnician) return;

    try {
      // TODO: replace with your update API
      toast.success("Update UI ready — connect your API here");
      setEditDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update technician");
    }
  }

  async function handleDeleteTechnician() {
    if (!selectedTechnician) return;

    try {
      // TODO: replace with your delete API
      toast.success("Delete UI ready — connect your API here");
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete technician");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 px-6 py-6 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Technician management</p>
              <h1 className="text-3xl font-semibold tracking-tight">Technicians</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                Add, update, and manage technician profiles, skills, and operational status.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/20">
              <ShieldCheck className="h-4 w-4" />
              Role-based workforce control
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Technicians"
          value={String(stats.total)}
          icon={Users2}
          note="All registered field staff"
          accentClassName="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Active"
          value={String(stats.active)}
          icon={BadgeCheck}
          note="Ready for jobs"
          accentClassName="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          title="Busy"
          value={String(stats.busy)}
          icon={BriefcaseBusiness}
          note="Currently assigned"
          accentClassName="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Average Rating"
          value={stats.avgRating}
          icon={Star}
          note="Across all technicians"
          accentClassName="bg-violet-50 text-violet-700"
        />
      </div>

      {/* Create technician */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
            Add Technician
          </CardTitle>
          <p className="text-sm text-slate-500">
            Create a new technician or link an existing user
          </p>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {serverMsg && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverMsg}</AlertDescription>
            </Alert>
          )}

          {tempPassword && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Temporary password: <strong>{tempPassword}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Technician
            </Button>
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
              className="rounded-xl"
            >
              Use Existing User
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {mode === "new" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Name</Label>
                  <Input {...register("name")} placeholder="Technician name" className="h-11 rounded-xl" />
                  {errors.name && (
                    <p className="text-xs text-rose-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Email</Label>
                  <Input {...register("email")} placeholder="tech@example.com" className="h-11 rounded-xl" />
                  {errors.email && (
                    <p className="text-xs text-rose-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Phone</Label>
                  <Input {...register("phone")} placeholder="+91xxxxxxxxxx" className="h-11 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Initial Password</Label>
                  <Input
                    {...register("password")}
                    placeholder="Optional, leave blank to auto-generate"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Select Existing User</Label>
                <select
                  {...register("userId")}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Choose user</option>
                  {filteredUsers.map((u: any) => (
                    <option key={u._id} value={u._id}>
                      {u.name} — {u.email || u.phone || "no contact"}
                    </option>
                  ))}
                </select>
                {errors.userId && (
                  <p className="text-xs text-rose-600">{errors.userId.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Skills</Label>
              <Input
                {...register("skillsText")}
                placeholder="AC, plumbing, electrical"
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-slate-500">Separate skills with commas.</p>
              {errors.skillsText && (
                <p className="text-xs text-rose-600">{errors.skillsText.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Vehicle Type</Label>
              <Input
                {...register("vehicleType")}
                placeholder="Bike / Scooter / Van"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                className="h-11 rounded-xl"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? "Saving..." : "Add Technician"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Technician table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Technicians
              </CardTitle>
              <p className="text-sm text-slate-500">
                Search, update, and remove technicians from the workforce
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search technician..."
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Name</TableHead>
                  <TableHead className="font-semibold text-slate-600">Email / Phone</TableHead>
                  <TableHead className="font-semibold text-slate-600">Skills</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">Jobs</TableHead>
                  <TableHead className="font-semibold text-slate-600">Rating</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                      Loading technicians...
                    </TableCell>
                  </TableRow>
                ) : filteredTechnicians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      <div className="mx-auto max-w-sm">
                        <p className="text-base font-medium text-slate-900">No technicians found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try a different search query or add a new technician.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTechnicians.map((tech: any) => (
                    <TableRow key={tech._id} className="hover:bg-slate-50/70">
                      <TableCell className="font-medium text-slate-900">
                        {tech.userId?.name || "-"}
                      </TableCell>

                      <TableCell>
                        <div className="text-slate-700">{tech.userId?.email || "-"}</div>
                        <div className="text-xs text-slate-500">{tech.userId?.phone || "-"}</div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {(tech.skills || []).length > 0 ? (
                            tech.skills.map((skill: string) => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50"
                              >
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">No skills added</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>{statusBadge(tech.status)}</TableCell>

                      <TableCell className="text-slate-600">{tech.jobsCompleted || 0}</TableCell>
                      <TableCell className="text-slate-600">{tech.rating || 0}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => openEditDialog(tech)}
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Update
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => openDeleteDialog(tech)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Update Technician
            </DialogTitle>
            <DialogDescription>
              Edit technician details, skills, and status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                defaultValue={selectedTechnician?.userId?.name || ""}
                placeholder="Technician name"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                defaultValue={selectedTechnician?.userId?.email || ""}
                placeholder="tech@example.com"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                defaultValue={selectedTechnician?.userId?.phone || ""}
                placeholder="+91xxxxxxxxxx"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                <option>active</option>
                <option>busy</option>
                <option>offline</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Skills</Label>
              <Input
                defaultValue={(selectedTechnician?.skills || []).join(", ")}
                placeholder="AC, plumbing, electrical"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              onClick={handleUpdateTechnician}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Delete Technician
            </DialogTitle>
            <DialogDescription>
              This technician will be removed from the system.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Are you sure you want to delete{" "}
            <strong>{selectedTechnician?.userId?.name || "this technician"}</strong>?
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleDeleteTechnician}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}