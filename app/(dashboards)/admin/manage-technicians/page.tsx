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
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

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

function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data } = await axios.get("/api/add-technicians");
      return data;
    },
  });
}

export default function AdminTechniciansPage() {
  const qc = useQueryClient();
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [mode, setMode] = useState<"new" | "existing">("new");

  const { data: techniciansData, isLoading } = useTechnicians();

  //console.log("Technicians:", techniciansData.users);
  const { data: usersData } = useUsers();

  const filteredUsers = useMemo(() => {
    const users = usersData?.users || [];
    return users.filter((u: any) => u.role !== "technician" && u.role !== "admin");
  }, [usersData]);

  const {
    register,
    handleSubmit,
    reset,
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
      setServerMsg(err?.response?.data?.error || err.message || "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Add Technician</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {serverMsg && <Alert>{serverMsg}</Alert>}
            {tempPassword && (
              <Alert>
                Temporary password: <strong>{tempPassword}</strong>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
              >
                Create New Technician
              </Button>
              <Button
                type="button"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
              >
                Use Existing User
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {mode === "new" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Name</Label>
                    <Input {...register("name")} placeholder="Technician name" />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input {...register("email")} placeholder="tech@example.com" />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input {...register("phone")} placeholder="+91xxxxxxxxxx" />
                  </div>

                  <div>
                    <Label>Initial Password</Label>
                    <Input {...register("password")} placeholder="Optional, leave blank to auto-generate" />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Select Existing User</Label>
                  <select
                    {...register("userId")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <option value="">Choose user</option>
                    {filteredUsers.map((u: any) => (
                      <option key={u._id} value={u._id}>
                        {u.name} — {u.email || u.phone || "no contact"}
                      </option>
                    ))}
                  </select>
                  {errors.userId && (
                    <p className="mt-1 text-sm text-red-500">{errors.userId.message}</p>
                  )}
                </div>
              )}

              <div>
                <Label>Skills</Label>
                <Input
                  {...register("skillsText")}
                  placeholder="AC, plumbing, electrical"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Separate skills with commas.
                </p>
                {errors.skillsText && (
                  <p className="mt-1 text-sm text-red-500">{errors.skillsText.message}</p>
                )}
              </div>

              <div>
                <Label>Vehicle Type</Label>
                <Input {...register("vehicleType")} placeholder="Bike / Scooter / Van" />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting} >
                  {isSubmitting ? "Saving..." : "Add Technician"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset()}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Technicians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email / Phone</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>Loading...</TableCell>
                    </TableRow>
                  ) : (
                    (techniciansData?.technicians || []).map((tech: any) => (
                      <TableRow key={tech._id}>
                        <TableCell className="font-medium">
                          {tech.userId?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <div>{tech.userId?.email || "-"}</div>
                          <div className="text-xs text-slate-500">{tech.userId?.phone || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {(tech.skills || []).map((skill: string) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{tech.status}</Badge>
                        </TableCell>
                        <TableCell>{tech.jobsCompleted || 0}</TableCell>
                        <TableCell>{tech.rating || 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}