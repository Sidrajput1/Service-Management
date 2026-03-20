// app/admin/leads/page.tsx
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLeads, useCreateLead, useDeleteLead } from "@/hooks/useLead";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

const CreateLeadSchema = z.object({
  name: z.string().min(1, "Name required").optional(),
  phone: z.string().min(6, "Phone required").optional(),
  email: z.string().email().optional(),
  serviceRequested: z.string().min(1, "Service required"),
  source: z.enum(["whatsapp", "ads", "call", "website", "walkin", "referral"]).optional(),
  remarks: z.string().optional(),
});

type CreateLeadForm = z.infer<typeof CreateLeadSchema>;

export default function AdminLeadsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading } = useLeads(page, 20, q) as { data: { leads: any[] } | undefined; isLoading: boolean };
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();


  const { register, handleSubmit, reset, formState } = useForm<CreateLeadForm>({
    resolver: zodResolver(CreateLeadSchema),
    defaultValues: { source: "website" },
  });

  async function onSubmit(values: CreateLeadForm) {
    await createLead.mutateAsync(values);
    reset();
    setPage(1);
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input {...register("name")} placeholder="Customer name" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...register("phone")} placeholder="+9198..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input {...register("email")} placeholder="customer@example.com" />
                </div>
                <div>
                  <Label>Service Requested</Label>
                  <Input {...register("serviceRequested")} placeholder="AC repair / Plumbing" />
                </div>
              </div>

              <div>
                <Label>Source</Label>
                <select {...register("source")} className="w-full border rounded px-2 py-2">
                  <option value="website">Website</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="ads">Ads</option>
                  <option value="call">Call</option>
                  <option value="walkin">Walk-in</option>
                  <option value="referral">Referral</option>
                </select>
              </div>

              <div>
                <Label>Remarks</Label>
                <Input {...register("remarks")} placeholder="Short note" />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createLead.isPending}>
                  {createLead.isPending ? "Creating..." : "Create Lead"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Leads</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
                <Button onClick={() => setPage(1)}>Search</Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>
                  ) : (
                    (data?.leads || []).map((lead: any) => (
                      <TableRow key={lead._id}>
                        <TableCell>{lead.name || "-"}</TableCell>
                        <TableCell>{lead.phone || "-"}</TableCell>
                        <TableCell>{lead.serviceRequested}</TableCell>
                        <TableCell>{lead.status}</TableCell>
                        <TableCell>{lead.source}</TableCell>
                        <TableCell>{new Date(lead.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { /* TODO: open detail/edit */ }}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteLead.mutate(lead._id)}
                            >
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

            <div className="flex items-center justify-between mt-4">
              <div>Page: {page}</div>
              <div className="flex gap-2">
                <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}