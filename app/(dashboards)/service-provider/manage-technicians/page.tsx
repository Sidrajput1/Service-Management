"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProviderTechnicians } from "@/hooks/useProviderOnboarding";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  Copy,
  PencilLine,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const TechnicianSchema = z.object({
  //mode: z.enum(["new", "existing"]),
  userId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  skillsText: z.string().min(1, "Enter at least one skill"),
  vehicleType: z.string().optional(),
});

type FormValues = z.infer<typeof TechnicianSchema>;

type TechnicianRecord = {
  _id?: string;
  userId?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  skills?: string[];
  status?: string;
  isActive?: boolean;
  jobsCompleted?: number;
  rating?: number;
  vehicleType?: string;
};

function statusBadge(status?: string, isActive?: boolean) {
  const s = (status || "offline").toLowerCase();

  if (isActive === false) {
    return (
      <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
        Inactive
      </Badge>
    );
  }

  if (s.includes("busy")) {
    return (
      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
        Busy
      </Badge>
    );
  }

  if (s.includes("on_leave")) {
    return (
      <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
        On Leave
      </Badge>
    );
  }

  if (s.includes("available")) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Available
      </Badge>
    );
  }

  if (s.includes("offline")) {
    return (
      <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
        Offline
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
      {status || "New"}
    </Badge>
  );
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
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="text-xs text-slate-500">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ManageTechniciansByProvider() {
  const qc = useQueryClient();

  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] =
    useState<TechnicianRecord | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "offline",
    isActive: true,
    skills: "",
    vehicleType: "",
  });

  const { data: techniciansData, isLoading } = useProviderTechnicians();

  const filteredTechnicians = useMemo(() => {
    const technicians = techniciansData?.technicians || [];
    const q = search.trim().toLowerCase();

    if (!q) return technicians;

    return technicians.filter((tech: TechnicianRecord) => {
      const name = tech.userId?.name || "";
      const email = tech.userId?.email || "";
      const phone = tech.userId?.phone || "";
      const skills = (tech.skills || []).join(" ");
      return `${name} ${email} ${phone} ${skills}`.toLowerCase().includes(q);
    });
  }, [techniciansData, search]);

  const stats = useMemo(() => {
    const technicians = (techniciansData?.technicians ||
      []) as TechnicianRecord[];
    const total = technicians.length;
    const active = technicians.filter((t) => t.isActive !== false).length;
    const busy = technicians.filter((t) =>
      (t.status || "").toLowerCase().includes("busy"),
    ).length;
    const avgRating =
      total > 0
        ? (
            technicians.reduce(
              (sum: number, t) => sum + Number(t.rating || 0),
              0,
            ) / total
          ).toFixed(1)
        : "0.0";

    return { total, active, busy, avgRating };
  }, [techniciansData]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(TechnicianSchema),
    defaultValues: {
      skillsText: "",
      vehicleType: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerMsg(null);
    setTempPassword(null);

    try {
      const payload: Record<string, string | string[] | undefined> = {
        skills: values.skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        vehicleType: values.vehicleType || undefined,
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      };

      const { data } = await axios.post(
        "/api/service-provider/technicians",
        payload,
      );

      setServerMsg("Technician created successfully.");
      toast.success("Technician added successfully");

      // if (data?.tempPassword) {
      //   setTempPassword(data.tempPassword);
      // }

      if (data?.temporaryPassword) {
        setTempPassword(data.temporaryPassword);
      }

      reset({
        skillsText: "",
        vehicleType: "",
      });
      qc.invalidateQueries({ queryKey: ["technicians"] });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : "Something went wrong";
      setServerMsg(msg);
      toast.error(msg);
    }
  }

  function openEditDialog(tech: TechnicianRecord) {
    setSelectedTechnician(tech);
    setEditForm({
      name: tech.userId?.name || "",
      email: tech.userId?.email || "",
      phone: tech.userId?.phone || "",
      status: tech.status || "offline",
      isActive: tech.isActive !== false,
      skills: (tech.skills || []).join(", "),
      vehicleType: tech.vehicleType || "",
    });
    setEditDialogOpen(true);
  }

  function openDeleteDialog(tech: TechnicianRecord) {
    setSelectedTechnician(tech);
    setDeleteDialogOpen(true);
  }

  async function handleUpdateTechnician() {
    if (!selectedTechnician?._id) {
      toast.error("No technician selected.");
      return;
    }

    try {
      const payload: Record<string, string | string[] | boolean | undefined> = {
        name: editForm.name.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        status: editForm.isActive ? editForm.status : "offline",
        isActive: editForm.isActive,
        skills: editForm.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        vehicleType: editForm.vehicleType.trim() || undefined,
      };

      const { data } = await axios.patch(
        `/api/service-provider/technicians/${selectedTechnician._id}`,
        payload,
      );

      toast.success(data?.message || "Technician updated successfully");
      qc.invalidateQueries({ queryKey: ["provider-technicians"] });
      setEditDialogOpen(false);
      setSelectedTechnician(null);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : "Unable to update technician";
      toast.error(msg);
    }
  }

  async function handleDeleteTechnician() {
    if (!selectedTechnician?._id) {
      toast.error("No technician selected.");
      return;
    }

    try {
      const { data } = await axios.delete(
        `/api/service-provider/technicians/${selectedTechnician._id}`,
      );

      toast.success(data?.message || "Technician removed successfully");
      qc.invalidateQueries({ queryKey: ["provider-technicians"] });
      setDeleteDialogOpen(false);
      setSelectedTechnician(null);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : "Unable to delete technician";
      toast.error(msg);
    }
  }

  return (
    <div>
      {/* Header */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 px-6 py-6 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">
                Technician management By Provider
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Technicians
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                Add, update, and manage technician profiles, skills, and
                operational status.
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
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground  dark:text-white">
            Add Technician
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {serverMsg && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverMsg}</AlertDescription>
            </Alert>
          )}

          {tempPassword && (
            <Alert className="border-amber-500/20 bg-amber-500/5 text-foreground">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />

              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      Technician account created
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Servizato generated a temporary password because no
                      password was provided.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center rounded-xl border border-border bg-background px-3 py-2">
                      <code className="truncate text-sm font-semibold text-foreground">
                        {tempPassword}
                      </code>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(tempPassword);

                          toast.success("Temporary password copied");
                        } catch {
                          toast.error("Unable to copy password");
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy password
                    </Button>
                  </div>

                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Save or share this password securely. It won't be shown
                    again after leaving this screen.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="soace-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground  dark:text-brand-teal">
                  Name
                </Label>
                <Input
                  {...register("name")}
                  placeholder="Technician name"
                  className="h-11 rounded-xl"
                />
                {errors.name && (
                  <p className="text-xs text-rose-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground  dark:text-brand-teal">
                  Email
                </Label>
                <Input
                  {...register("email")}
                  placeholder="tech@example.com"
                  className="h-11 rounded-xl"
                />
                {errors.email && (
                  <p className="text-xs text-rose-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground  dark:text-brand-teal">
                  Phone
                </Label>
                <Input
                  {...register("phone")}
                  placeholder="+91xxxxxxxxxx"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground  dark:text-brand-teal">
                  Initial Password
                </Label>
                <Input
                  {...register("password")}
                  placeholder="Optional, leave blank to auto-generate"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground  dark:text-brand-teal">
                  Skills
                </Label>
                <Input
                  {...register("skillsText")}
                  placeholder="AC, plumbing, electrical"
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-slate-500">
                  Separate skills with commas.
                </p>
                {errors.skillsText && (
                  <p className="text-xs text-rose-600">
                    {errors.skillsText.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground  dark:text-brand-teal">
                  Vehicle Type
                </Label>
                <Input
                  {...register("vehicleType")}
                  placeholder="Bike / Scooter / Van"
                  className="h-11 rounded-xl"
                />
              </div>
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
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground  dark:text-brand-teal">
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
                  <TableHead className="font-semibold text-slate-600">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Email / Phone
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Skills
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Jobs
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Rating
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-slate-500"
                    >
                      Loading technicians...
                    </TableCell>
                  </TableRow>
                ) : filteredTechnicians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      <div className="mx-auto max-w-sm">
                        <p className="text-base font-medium text-foreground  dark:text-brand-teal">
                          No technicians found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try a different search query or add a new technician.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTechnicians.map((tech: TechnicianRecord) => (
                    <TableRow key={tech._id} className="hover:bg-slate-50/70">
                      <TableCell className="font-medium text-foreground  dark:text-brand-teal">
                        {tech.userId?.name || "-"}
                      </TableCell>

                      <TableCell>
                        <div className="text-slate-700">
                          {tech.userId?.email || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {tech.userId?.phone || "-"}
                        </div>
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
                            <span className="text-sm text-slate-500">
                              No skills added
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col items-start gap-2">
                          {statusBadge(tech.status, tech.isActive)}
                          <span className="text-xs text-foreground  dark:text-brand-teal">
                            {tech.isActive === false ? "Inactive" : "Active"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-foreground  dark:text-brand-lime">
                        {tech.jobsCompleted || 0}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {tech.rating || 0}
                      </TableCell>

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
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedTechnician(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Update Technician
            </DialogTitle>
            <DialogDescription>
              Edit technician details, availability, and job status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Technician name"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="tech@example.com"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+91xxxxxxxxxx"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 dark:bg-black bg-white px-3 text-sm outline-none"
              >
                <option value="offline">Offline</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="on_leave">On leave</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Skills</Label>
              <Input
                value={editForm.skills}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, skills: e.target.value }))
                }
                placeholder="AC, plumbing, electrical"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Vehicle Type</Label>
              <Input
                value={editForm.vehicleType}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    vehicleType: e.target.value,
                  }))
                }
                placeholder="Bike / Scooter / Van"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Account Status</Label>
              <button
                type="button"
                onClick={() =>
                  setEditForm((prev) => ({ ...prev, isActive: !prev.isActive }))
                }
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                  editForm.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div>
                  <div className="font-medium">
                    {editForm.isActive ? "Active" : "Inactive"}
                  </div>
                  <div className="text-xs opacity-80">
                    {editForm.isActive
                      ? "Technician can receive assignments"
                      : "Technician is hidden from active assignment flow"}
                  </div>
                </div>
                <span
                  className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition ${
                    editForm.isActive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white transition ${
                      editForm.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditDialogOpen(false)}
            >
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
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setSelectedTechnician(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Delete Technician
            </DialogTitle>
            <DialogDescription>
              This technician will be deactivated from the system.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Are you sure you want to deactivate{" "}
            <strong>
              {selectedTechnician?.userId?.name || "this technician"}
            </strong>
            ?
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleDeleteTechnician}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManageTechniciansByProvider;
