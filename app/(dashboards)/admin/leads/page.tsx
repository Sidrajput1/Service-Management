// app/admin/leads/page.tsx
"use client";

import React, { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BriefcaseBusiness, CalendarDays, Edit3, MoreHorizontal, PhoneCall, RefreshCcw, Search, Trash2, Users2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CreateLeadSchema = z.object({
  name: z.string().min(1, "Name required").optional(),
  phone: z.string().min(6, "Phone required").optional(),
  email: z.string().email().optional(),
  serviceRequested: z.string().min(1, "Service required"),
  source: z.enum(["whatsapp", "ads", "call", "website", "walkin", "referral"]).optional(),
  remarks: z.string().optional(),
});

type CreateLeadForm = z.infer<typeof CreateLeadSchema>;

function getStatusBadge(status?: string) {
  const value = (status || "new").toLowerCase();

  if (value.includes("won") || value.includes("converted") || value.includes("closed")) {
    return <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Converted</Badge>;
  }

  if (value.includes("follow")) {
    return <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">Follow-up</Badge>;
  }

  if (value.includes("lost") || value.includes("cancel")) {
    return <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">Lost</Badge>;
  }

  return <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">New</Badge>;
};

function getSourceBadge(source?: string) {
  const value = (source || "-").toLowerCase();

  if (value === "website") return <Badge variant="secondary" className="rounded-full bg-sky-50 text-sky-700 hover:bg-sky-50">Website</Badge>;
  if (value === "whatsapp") return <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">WhatsApp</Badge>;
  if (value === "ads") return <Badge variant="secondary" className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">Ads</Badge>;
  if (value === "call") return <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">Call</Badge>;
  if (value === "walkin") return <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">Walk-in</Badge>;
  if (value === "referral") return <Badge variant="secondary" className="rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Referral</Badge>;

  return <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">Other</Badge>;
};

function formatDate(date: string | Date) {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return "-";
  }
}

export default function AdminLeadsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading } = useLeads(page, 20, q) as { data: { leads: any[] } | undefined; isLoading: boolean };
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();

   const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [sourceFilter, setSourceFilter] = useState("all");


  const { register, handleSubmit, reset, formState } = useForm<CreateLeadForm>({
    resolver: zodResolver(CreateLeadSchema),
    defaultValues: { source: "website" },
    
  });

  const leads = data?.leads || [];

   const filteredLeads = useMemo(() => {
    if (sourceFilter === "all") return leads;
    return leads.filter((lead: any) => (lead.source || "").toLowerCase() === sourceFilter);
  }, [leads, sourceFilter]);

   async function onSubmit(values: CreateLeadForm) {
    try {
      await createLead.mutateAsync(values);
      toast.success("Lead created successfully");
      reset({ source: "website" });
      setPage(1);
      //refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create lead");
    }
  };

  async function handleDeleteLead(leadId: string) {
    try {
      await deleteLead.mutateAsync(leadId);
      toast.success("Lead deleted successfully");
      setDeleteTarget(null);
      //refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete lead");
    }
  }

  const summary = useMemo(() => {
    const total = leads.length;
    const website = leads.filter((l: any) => (l.source || "").toLowerCase() === "website").length;
    const whatsapp = leads.filter((l: any) => (l.source || "").toLowerCase() === "whatsapp").length;
    const newCount = leads.filter((l: any) => ((l.status || "new").toLowerCase() === "new")).length;

    return { total, website, whatsapp, newCount };
  }, [leads]);

  return (
    // <div className="p-6">
    //   <div className="max-w-4xl mx-auto space-y-6">
    //     <Card>
    //       <CardHeader>
    //         <CardTitle>Create Lead</CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3">
    //           <div className="grid grid-cols-2 gap-3">
    //             <div>
    //               <Label>Name</Label>
    //               <Input {...register("name")} placeholder="Customer name" />
    //             </div>
    //             <div>
    //               <Label>Phone</Label>
    //               <Input {...register("phone")} placeholder="+9198..." />
    //             </div>
    //           </div>

    //           <div className="grid grid-cols-2 gap-3">
    //             <div>
    //               <Label>Email</Label>
    //               <Input {...register("email")} placeholder="customer@example.com" />
    //             </div>
    //             <div>
    //               <Label>Service Requested</Label>
    //               <Input {...register("serviceRequested")} placeholder="AC repair / Plumbing" />
    //             </div>
    //           </div>

    //           <div>
    //             <Label>Source</Label>
    //             <select {...register("source")} className="w-full border rounded px-2 py-2">
    //               <option value="website">Website</option>
    //               <option value="whatsapp">WhatsApp</option>
    //               <option value="ads">Ads</option>
    //               <option value="call">Call</option>
    //               <option value="walkin">Walk-in</option>
    //               <option value="referral">Referral</option>
    //             </select>
    //           </div>

    //           <div>
    //             <Label>Remarks</Label>
    //             <Input {...register("remarks")} placeholder="Short note" />
    //           </div>

    //           <div className="flex gap-2">
    //             <Button type="submit" disabled={createLead.isPending}>
    //               {createLead.isPending ? "Creating..." : "Create Lead"}
    //             </Button>
    //             <Button type="button" variant="ghost" onClick={() => reset()}>
    //               Reset
    //             </Button>
    //           </div>
    //         </form>
    //       </CardContent>
    //     </Card>

    //     <Card>
    //       <CardHeader>
    //         <div className="flex items-center justify-between w-full">
    //           <CardTitle>Leads</CardTitle>
    //           <div className="flex gap-2">
    //             <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
    //             <Button onClick={() => setPage(1)}>Search</Button>
    //           </div>
    //         </div>
    //       </CardHeader>

    //       <CardContent>
    //         <div className="overflow-auto">
    //           <Table>
    //             <TableHeader>
    //               <TableRow>
    //                 <TableHead>Name</TableHead>
    //                 <TableHead>Phone</TableHead>
    //                 <TableHead>Service</TableHead>
    //                 <TableHead>Status</TableHead>
    //                 <TableHead>Source</TableHead>
    //                 <TableHead>Created</TableHead>
    //                 <TableHead>Actions</TableHead>
    //               </TableRow>
    //             </TableHeader>
    //             <TableBody>
    //               {isLoading ? (
    //                 <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>
    //               ) : (
    //                 (data?.leads || []).map((lead: any) => (
    //                   <TableRow key={lead._id}>
    //                     <TableCell>{lead.name || "-"}</TableCell>
    //                     <TableCell>{lead.phone || "-"}</TableCell>
    //                     <TableCell>{lead.serviceRequested}</TableCell>
    //                     <TableCell>{lead.status}</TableCell>
    //                     <TableCell>{lead.source}</TableCell>
    //                     <TableCell>{new Date(lead.createdAt).toLocaleString()}</TableCell>
    //                     <TableCell>
    //                       <div className="flex gap-2">
    //                         <Button size="sm" variant="ghost" onClick={() => { /* TODO: open detail/edit */ }}>
    //                           Edit
    //                         </Button>
    //                         <Button
    //                           size="sm"
    //                           variant="destructive"
    //                           onClick={() => deleteLead.mutate(lead._id)}
    //                         >
    //                           Delete
    //                         </Button>
    //                       </div>
    //                     </TableCell>
    //                   </TableRow>
    //                 ))
    //               )}
    //             </TableBody>
    //           </Table>
    //         </div>

    //         <div className="flex items-center justify-between mt-4">
    //           <div>Page: {page}</div>
    //           <div className="flex gap-2">
    //             <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
    //               Prev
    //             </Button>
    //             <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>
    //   </div>
    // </div>

  <div className="space-y-6 p-0">
      {/* Top summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Leads</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Website Leads</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.website}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">WhatsApp Leads</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.whatsapp}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Fresh Leads</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.newCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create lead card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Create Lead
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Add a new customer lead and assign it to your pipeline
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Name</Label>
                <Input {...register("name")} placeholder="Customer name" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Phone</Label>
                <Input {...register("phone")} placeholder="+91 9876543210" className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Email</Label>
                <Input {...register("email")} placeholder="customer@example.com" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Service Requested</Label>
                <Input {...register("serviceRequested")} placeholder="AC repair / Plumbing" className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Source</Label>
                <Select
                  defaultValue="website"
                  onValueChange={(value) => {
                    // keep react-hook-form in sync
                    reset({ ...formState.defaultValues, source: value } as any, { keepValues: true });
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="ads">Ads</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="walkin">Walk-in</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
                {/* keep hidden registered value */}
                <input type="hidden" {...register("source")} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Remarks</Label>
                <Input {...register("remarks")} placeholder="Short note" className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset({ source: "website" })}
                className="h-11 rounded-xl"
              >
                Reset
              </Button>

              <Button
                type="submit"
                disabled={createLead.isPending}
                className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700"
              >
                {createLead.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Leads list card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Leads
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                View, search, filter, and manage all incoming leads
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search leads..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <Select value={sourceFilter} onValueChange={(value) => value !== null && setSourceFilter(value)}>
                <SelectTrigger className="h-11 w-full rounded-xl sm:w-40">
                  <SelectValue placeholder="Filter source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="ads">Ads</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="walkin">Walk-in</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setPage(1);
                  //refetch?.();
                }}
                className="h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-hidden rounded-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-600">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600">Phone</TableHead>
                    <TableHead className="font-semibold text-slate-600">Service</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600">Source</TableHead>
                    <TableHead className="font-semibold text-slate-600">Created</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        Loading leads...
                      </TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center">
                        <div className="mx-auto max-w-sm">
                          <p className="text-base font-medium text-slate-900">No leads found</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Try changing the search query or source filter.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead: any) => (
                      <TableRow key={lead._id} className="hover:bg-slate-50/70">
                        <TableCell className="font-medium text-slate-900">
                          {lead.name || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600">{lead.phone || "-"}</TableCell>
                        <TableCell className="text-slate-600">
                          {lead.serviceRequested || "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        <TableCell>{getSourceBadge(lead.source)}</TableCell>
                        <TableCell className="text-slate-600">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                              <DropdownMenuItem
                                onClick={() => toast.info("Edit lead action can open your edit dialog")}
                                className="rounded-lg"
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(lead)}
                                className="rounded-lg text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
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
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  variant="outline"
                  className="rounded-xl"
                >
                  Prev
                </Button>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The lead will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => deleteTarget && handleDeleteLead(deleteTarget._id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}