// app/admin/leads/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLeads, useCreateLead, useDeleteLead } from "@/hooks/useLead";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Edit3,
  Filter,
  Inbox,
  Mail,
  MapPin,
  MoreHorizontal,
  PhoneCall,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  Users2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const CreateLeadSchema = z.object({
  name: z.string().min(1, "Name required").optional(),
  phone: z.string().min(6, "Phone required").optional(),
  email: z.string().email().optional(),
  serviceRequested: z.string().min(1, "Service required"),
  source: z
    .enum(["whatsapp", "ads", "call", "website", "walkin", "referral"])
    .optional(),
  remarks: z.string().optional(),
});

type CreateLeadForm = z.infer<typeof CreateLeadSchema>;

function getStatusBadge(status?: string) {
  const value = (status || "new").toLowerCase();

  if (
    value.includes("won") ||
    value.includes("converted") ||
    value.includes("closed")
  ) {
    return (
      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Converted
      </Badge>
    );
  }

  if (value.includes("follow")) {
    return (
      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
        Follow-up
      </Badge>
    );
  }

  if (value.includes("lost") || value.includes("cancel")) {
    return (
      <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
        Lost
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
      New
    </Badge>
  );
}



function getSourceBadge(source?: string) {
  const value = (source || "-").toLowerCase();

  const common = "rounded-full border text-xs font-medium";

  if (value === "website")
    return (
      <Badge
        variant="secondary"
        className={`${common} border-sky-500/15 bg-sky-500/10 text-sky-700 dark:text-sky-400`}
      >
        Website
      </Badge>
    );
  if (value === "whatsapp")
    return (
      <Badge
        variant="secondary"
        className={`${common} border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`}
      >
        WhatsApp
      </Badge>
    );
  if (value === "ads")
    return (
      <Badge
        variant="secondary"
        className={`${common} border-violet-500/15 bg-violet-500/10 text-violet-700 dark:text-violet-400`}
      >
        Ads
      </Badge>
    );
  if (value === "call")
    return (
      <Badge
        variant="secondary"
        className={`${common} border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-400`}
      >
        Call
      </Badge>
    );
  if (value === "walkin")
    return (
      <Badge
        variant="secondary"
        className={`${common} border-border bg-muted text-muted-foreground`}
      >
        Walk-in
      </Badge>
    );
  if (value === "referral")
    return (
      <Badge
        variant="secondary"
        className={`${common} border-indigo-500/15 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400`}
      >
        Referral
      </Badge>
    );

  return (
    <Badge
      variant="secondary"
      className={`${common} border-border bg-muted text-muted-foreground`}
    >
      Other
    </Badge>
  );
}

function formatDate(date?: string | Date | null) {

  if(!date) return "-";
  try {
    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function getIntials(name?: string) {
  if (!name) return "L";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LeadTableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-7 gap-3 rounded-2xl border border-border bg-card px-4 py-4"
        >
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function LeadPreviewCard({
  values,
  sourceLabel,
}: {
  values: CreateLeadForm;
  sourceLabel: string;
}) {
  return (
    <Card className="h-full border-border bg-card/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Live preview
        </CardTitle>
        <CardDescription>
          See how the lead will appear before you save it.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-border bg-muted/30 p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarFallback className="bg-background text-sm font-semibold text-foreground">
                {getIntials(values.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-semibold text-foreground">
                  {values.name?.trim() || "Customer name"}
                </p>
                {getStatusBadge("new")}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {values.serviceRequested?.trim() || "Service requested"}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">
                {values.phone?.trim() || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate font-medium text-foreground">
                {values.email?.trim() || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium text-foreground">{sourceLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Focus</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              Fast capture
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Workflow</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              Pipeline ready
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Style</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              Premium UI
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-background p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                What happens next
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The lead enters your pipeline with the selected source, then
                your team can follow up, convert, or close it later.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminLeadsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading } = useLeads(page, 20, q) as {
    data: { leads: any[] } | undefined;
    isLoading: boolean;
  };
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");

  const { register, handleSubmit, reset, formState, control, watch } =
    useForm<CreateLeadForm>({
      resolver: zodResolver(CreateLeadSchema),
      defaultValues: {
        name: "",
        phone: "",
        email: "",
        serviceRequested: "",
        source: "website",
        remarks: "",
      },
    });

  const leads = data?.leads || [];

  const filteredLeads = useMemo(() => {
    if (sourceFilter === "all") return leads;
    return leads.filter(
      (lead: any) => (lead.source || "").toLowerCase() === sourceFilter,
    );
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
  }

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
    const website = leads.filter(
      (l: any) => (l.source || "").toLowerCase() === "website",
    ).length;
    const whatsapp = leads.filter(
      (l: any) => (l.source || "").toLowerCase() === "whatsapp",
    ).length;
    const newCount = leads.filter(
      (l: any) => (l.status || "new").toLowerCase() === "new",
    ).length;

    const websiteShare = total ? Math.round((website / total) * 100) : 0;
    const whatsappShare = total ? Math.round((whatsapp / total) * 100) : 0;
    const newShare = total ? Math.round((newCount / total) * 100) : 0;

    return {
      total,
      website,
      whatsapp,
      newCount,
      websiteShare,
      whatsappShare,
      newShare,
    };
  }, [leads]);

  const watchedValues = watch();
  const sourceLabel = useMemo(() => {
    const value = (watchedValues.source || "website").toLowerCase();
    const map: Record<string, string> = {
      website: "Website",
      whatsapp: "WhatsApp",
      ads: "Ads",
      call: "Call",
      walkin: "Walk-in",
      referral: "Referral",
    };
    return map[value] || "Other";
  }, [watchedValues.source]);

  // const summary = useMemo(() => {
  //   const total = leads.length;
  //   const website = leads.filter((l: any) => (l.source || "").toLowerCase() === "website").length;
  //   const whatsapp = leads.filter((l: any) => (l.source || "").toLowerCase() === "whatsapp").length;
  //   const newCount = leads.filter((l: any) => ((l.status || "new").toLowerCase() === "new")).length;

  //   return { total, website, whatsapp, newCount };
  // }, [leads]);

  return (
    // <div className="space-y-6 p-0 bg-background text-foreground">
    //     {/* Top summary cards */}
    //     <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ">
    //       <Card className="border-slate-200 shadow-sm bg-background ">
    //         <CardContent className="flex items-center gap-4 p-5">
    //           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-blue-700">
    //             <Users2 className="h-5 w-5" />
    //           </div>
    //           <div>
    //             <p className="text-sm text-slate-500">Total Leads</p>
    //             <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.total}</p>
    //           </div>
    //         </CardContent>
    //       </Card>

    //       <Card className="border-slate-200 shadow-sm">
    //         <CardContent className="flex items-center gap-4 p-5">
    //           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
    //             <BriefcaseBusiness className="h-5 w-5" />
    //           </div>
    //           <div>
    //             <p className="text-sm text-slate-500">Website Leads</p>
    //             <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.website}</p>
    //           </div>
    //         </CardContent>
    //       </Card>

    //       <Card className="border-slate-200 shadow-sm">
    //         <CardContent className="flex items-center gap-4 p-5">
    //           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
    //             <PhoneCall className="h-5 w-5" />
    //           </div>
    //           <div>
    //             <p className="text-sm text-slate-500">WhatsApp Leads</p>
    //             <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.whatsapp}</p>
    //           </div>
    //         </CardContent>
    //       </Card>

    //       <Card className="border-slate-200 shadow-sm">
    //         <CardContent className="flex items-center gap-4 p-5">
    //           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
    //             <CalendarDays className="h-5 w-5" />
    //           </div>
    //           <div>
    //             <p className="text-sm text-slate-500">Fresh Leads</p>
    //             <p className="text-2xl font-semibold tracking-tight text-slate-900">{summary.newCount}</p>
    //           </div>
    //         </CardContent>
    //       </Card>
    //     </div>

    //     {/* Create lead card */}
    //     <Card className="border-slate-200 shadow-sm">
    //       <CardHeader className="border-b border-slate-100">
    //         <div className="flex items-center justify-between gap-3">
    //           <div>
    //             <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
    //               Create Lead
    //             </CardTitle>
    //             <p className="mt-1 text-sm text-slate-500">
    //               Add a new customer lead and assign it to your pipeline
    //             </p>
    //           </div>
    //         </div>
    //       </CardHeader>

    //       <CardContent className="pt-6">
    //         <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
    //           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    //             <div className="space-y-2">
    //               <Label className="text-sm font-medium text-slate-700">Name</Label>
    //               <Input {...register("name")} placeholder="Customer name" className="h-11 rounded-xl" />
    //             </div>
    //             <div className="space-y-2">
    //               <Label className="text-sm font-medium text-slate-700">Phone</Label>
    //               <Input {...register("phone")} placeholder="+91 9876543210" className="h-11 rounded-xl" />
    //             </div>
    //           </div>

    //           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    //             <div className="space-y-2">
    //               <Label className="text-sm font-medium text-slate-700">Email</Label>
    //               <Input {...register("email")} placeholder="customer@example.com" className="h-11 rounded-xl" />
    //             </div>
    //             <div className="space-y-2">
    //               <Label className="text-sm font-medium text-slate-700">Service Requested</Label>
    //               <Input {...register("serviceRequested")} placeholder="AC repair / Plumbing" className="h-11 rounded-xl" />
    //             </div>
    //           </div>

    //           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    //             <div className="space-y-2">
    //               <Label className="text-sm font-medium text-slate-700">Source</Label>
    //               <Select
    //                 defaultValue="website"
    //                 onValueChange={(value) => {
    //                   // keep react-hook-form in sync
    //                   reset({ ...formState.defaultValues, source: value } as any, { keepValues: true });
    //                 }}
    //               >
    //                 <SelectTrigger className="h-11 rounded-xl">
    //                   <SelectValue placeholder="Select source" />
    //                 </SelectTrigger>
    //                 <SelectContent>
    //                   <SelectItem value="website">Website</SelectItem>
    //                   <SelectItem value="whatsapp">WhatsApp</SelectItem>
    //                   <SelectItem value="ads">Ads</SelectItem>
    //                   <SelectItem value="call">Call</SelectItem>
    //                   <SelectItem value="walkin">Walk-in</SelectItem>
    //                   <SelectItem value="referral">Referral</SelectItem>
    //                 </SelectContent>
    //               </Select>
    //               {/* keep hidden registered value */}
    //               <input type="hidden" {...register("source")} />
    //             </div>

    //             <div className="space-y-2">
    //               <Label className="text-sm font-medium text-slate-700">Remarks</Label>
    //               <Input {...register("remarks")} placeholder="Short note" className="h-11 rounded-xl" />
    //             </div>
    //           </div>

    //           <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
    //             <Button
    //               type="button"
    //               variant="outline"
    //               onClick={() => reset({ source: "website" })}
    //               className="h-11 rounded-xl"
    //             >
    //               Reset
    //             </Button>

    //             <Button
    //               type="submit"
    //               disabled={createLead.isPending}
    //               className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700"
    //             >
    //               {createLead.isPending ? "Creating..." : "Create Lead"}
    //             </Button>
    //           </div>
    //         </form>
    //       </CardContent>
    //     </Card>

    //     {/* Leads list card */}
    //     <Card className="border-slate-200 shadow-sm">
    //       <CardHeader className="border-b border-slate-100">
    //         <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    //           <div>
    //             <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
    //               Leads
    //             </CardTitle>
    //             <p className="mt-1 text-sm text-slate-500">
    //               View, search, filter, and manage all incoming leads
    //             </p>
    //           </div>

    //           <div className="flex flex-col gap-3 sm:flex-row">
    //             <div className="relative w-full sm:w-72">
    //               <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    //               <Input
    //                 placeholder="Search leads..."
    //                 value={q}
    //                 onChange={(e) => setQ(e.target.value)}
    //                 className="h-11 rounded-xl pl-10"
    //               />
    //             </div>

    //             <Select value={sourceFilter} onValueChange={(value) => value !== null && setSourceFilter(value)}>
    //               <SelectTrigger className="h-11 w-full rounded-xl sm:w-40">
    //                 <SelectValue placeholder="Filter source" />
    //               </SelectTrigger>
    //               <SelectContent>
    //                 <SelectItem value="all">All Sources</SelectItem>
    //                 <SelectItem value="website">Website</SelectItem>
    //                 <SelectItem value="whatsapp">WhatsApp</SelectItem>
    //                 <SelectItem value="ads">Ads</SelectItem>
    //                 <SelectItem value="call">Call</SelectItem>
    //                 <SelectItem value="walkin">Walk-in</SelectItem>
    //                 <SelectItem value="referral">Referral</SelectItem>
    //               </SelectContent>
    //             </Select>

    //             <Button
    //               onClick={() => {
    //                 setPage(1);
    //                 //refetch?.();
    //               }}
    //               className="h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
    //             >
    //               <RefreshCcw className="mr-2 h-4 w-4" />
    //               Refresh
    //             </Button>
    //           </div>
    //         </div>
    //       </CardHeader>

    //       <CardContent className="p-0">
    //         <div className="overflow-hidden rounded-none">
    //           <div className="overflow-x-auto">
    //             <Table>
    //               <TableHeader className="bg-slate-50">
    //                 <TableRow>
    //                   <TableHead className="font-semibold text-slate-600">Name</TableHead>
    //                   <TableHead className="font-semibold text-slate-600">Phone</TableHead>
    //                   <TableHead className="font-semibold text-slate-600">Service</TableHead>
    //                   <TableHead className="font-semibold text-slate-600">Status</TableHead>
    //                   <TableHead className="font-semibold text-slate-600">Source</TableHead>
    //                   <TableHead className="font-semibold text-slate-600">Created</TableHead>
    //                   <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
    //                 </TableRow>
    //               </TableHeader>

    //               <TableBody>
    //                 {isLoading ? (
    //                   <TableRow>
    //                     <TableCell colSpan={7} className="py-10 text-center text-slate-500">
    //                       Loading leads...
    //                     </TableCell>
    //                   </TableRow>
    //                 ) : filteredLeads.length === 0 ? (
    //                   <TableRow>
    //                     <TableCell colSpan={7} className="py-14 text-center">
    //                       <div className="mx-auto max-w-sm">
    //                         <p className="text-base font-medium text-slate-900">No leads found</p>
    //                         <p className="mt-1 text-sm text-slate-500">
    //                           Try changing the search query or source filter.
    //                         </p>
    //                       </div>
    //                     </TableCell>
    //                   </TableRow>
    //                 ) : (
    //                   filteredLeads.map((lead: any) => (
    //                     <TableRow key={lead._id} className="hover:bg-slate-50/70">
    //                       <TableCell className="font-medium text-slate-900">
    //                         {lead.name || "-"}
    //                       </TableCell>
    //                       <TableCell className="text-slate-600">{lead.phone || "-"}</TableCell>
    //                       <TableCell className="text-slate-600">
    //                         {lead.serviceRequested || "-"}
    //                       </TableCell>
    //                       <TableCell>{getStatusBadge(lead.status)}</TableCell>
    //                       <TableCell>{getSourceBadge(lead.source)}</TableCell>
    //                       <TableCell className="text-slate-600">
    //                         {formatDate(lead.createdAt)}
    //                       </TableCell>
    //                       <TableCell className="text-right">
    //                         <DropdownMenu>
    //                           <DropdownMenuTrigger>
    //                             <Button variant="ghost" size="icon" className="rounded-xl">
    //                               <MoreHorizontal className="h-4 w-4" />
    //                             </Button>
    //                           </DropdownMenuTrigger>
    //                           <DropdownMenuContent align="end" className="w-40 rounded-xl">
    //                             <DropdownMenuItem
    //                               onClick={() => toast.info("Edit lead action can open your edit dialog")}
    //                               className="rounded-lg"
    //                             >
    //                               <Edit3 className="mr-2 h-4 w-4" />
    //                               Edit
    //                             </DropdownMenuItem>
    //                             <DropdownMenuItem
    //                               onClick={() => setDeleteTarget(lead)}
    //                               className="rounded-lg text-rose-600 focus:text-rose-600"
    //                             >
    //                               <Trash2 className="mr-2 h-4 w-4" />
    //                               Delete
    //                             </DropdownMenuItem>
    //                           </DropdownMenuContent>
    //                         </DropdownMenu>
    //                       </TableCell>
    //                     </TableRow>
    //                   ))
    //                 )}
    //               </TableBody>
    //             </Table>
    //           </div>

    //           <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
    //             <div className="text-sm text-slate-500">
    //               Page <span className="font-medium text-slate-900">{page}</span>
    //             </div>

    //             <div className="flex gap-2">
    //               <Button
    //                 disabled={page <= 1}
    //                 onClick={() => setPage((p) => Math.max(1, p - 1))}
    //                 variant="outline"
    //                 className="rounded-xl"
    //               >
    //                 Prev
    //               </Button>
    //               <Button
    //                 onClick={() => setPage((p) => p + 1)}
    //                 className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
    //               >
    //                 Next
    //               </Button>
    //             </div>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     {/* Delete confirm dialog */}
    //     <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
    //       <AlertDialogContent className="rounded-2xl">
    //         <AlertDialogHeader>
    //           <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
    //           <AlertDialogDescription>
    //             This action cannot be undone. The lead will be removed permanently.
    //           </AlertDialogDescription>
    //         </AlertDialogHeader>
    //         <AlertDialogFooter>
    //           <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
    //           <AlertDialogAction
    //             className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
    //             onClick={() => deleteTarget && handleDeleteLead(deleteTarget._id)}
    //           >
    //             Delete
    //           </AlertDialogAction>
    //         </AlertDialogFooter>
    //       </AlertDialogContent>
    //     </AlertDialog>
    //   </div>

    <div className="space-y-8 bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Leads workspace
          </div>
          <div>
            <h1 className="font-poppins text-3xl font-semibold tracking-tight">
              Leads
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Capture, filter, and manage incoming leads from every channel in
              one clean pipeline.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Current leads</p>
            <p className="mt-1 text-lg font-semibold">{summary.total}</p>
          </div>
          <Button
            onClick={() => {
              setPage(1);
            }}
            variant="outline"
            className="h-11 rounded-2xl"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI section */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <Users2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Total leads</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {summary.total ? "Live" : "Empty"}
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary.total}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                All leads currently fetched from the API.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Website leads</p>
                <span className="text-xs font-medium text-muted-foreground">
                  {summary.websiteShare}% share
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary.website}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Main inbound source for the current set.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">WhatsApp leads</p>
                <span className="text-xs font-medium text-muted-foreground">
                  {summary.whatsappShare}% share
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary.whatsapp}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Good signal for quick-response conversions.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Fresh leads</p>
                <span className="text-xs font-medium text-muted-foreground">
                  {summary.newShare}% share
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary.newCount}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                New items waiting for follow-up.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create lead section */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-2 border-b border-border/70">
          <CardTitle className="text-xl font-semibold">Create lead</CardTitle>
          <CardDescription>
            Capture customer information in a clean workspace-style form.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-border/70 p-6 lg:border-b-0 lg:border-r lg:p-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Customer information
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Keep the fields simple so your team can capture leads
                      quickly.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Name</Label>
                      <Input
                        {...register("name")}
                        placeholder="Customer name"
                        className="h-11 rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Phone</Label>
                      <Input
                        {...register("phone")}
                        placeholder="+91 9876543210"
                        className="h-11 rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email</Label>
                      <Input
                        {...register("email")}
                        placeholder="customer@example.com"
                        className="h-11 rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Source</Label>
                      <Controller
                        control={control}
                        name="source"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="h-11 rounded-2xl">
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
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Service information
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Give the team enough detail to route the lead correctly.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Service requested
                      </Label>
                      <Input
                        {...register("serviceRequested")}
                        placeholder="AC repair / Plumbing / Electrical"
                        className="h-11 rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Remarks</Label>
                      <Textarea
                        {...register("remarks")}
                        placeholder="Add a short note about timing, urgency, or customer preferences."
                        className="min-h-30 rounded-2xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      reset({
                        name: "",
                        phone: "",
                        email: "",
                        serviceRequested: "",
                        source: "website",
                        remarks: "",
                      })
                    }
                    className="h-11 rounded-2xl"
                  >
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    disabled={createLead.isPending}
                    className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  >
                    {createLead.isPending ? "Creating..." : "Create lead"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="p-6 lg:p-7">
              <LeadPreviewCard
                values={watchedValues}
                sourceLabel={sourceLabel}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads table section */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                Leads list
              </CardTitle>
              <CardDescription>
                Search, filter, and manage incoming leads with quick actions.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, email..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 rounded-2xl pl-10"
                />
              </div>

              <Select
                value={sourceFilter}
                onValueChange={(value) => setSourceFilter(value ?? "all")}
              >
                <SelectTrigger className="h-11 w-full rounded-2xl sm:w-44">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="ads">Ads</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="walkin">Walk-in</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              All
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              New
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              Follow-up
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              Converted
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <LeadTableSkeleton />
          ) : filteredLeads.length === 0 ? (
            <div className="flex min-h-80 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50">
                  <Inbox className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No leads yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start capturing inquiries to build your pipeline and keep the
                  team moving.
                </p>
                <Button
                  className="mt-5 h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                  onClick={() => {
                    setSourceFilter("all");
                    setQ("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-muted-foreground">
                        Lead
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground">
                        Contact
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground">
                        Service
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground">
                        Source
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground">
                        Created
                      </TableHead>
                      <TableHead className="text-right font-medium text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredLeads.map((lead: any) => (
                      <TableRow
                        key={lead._id}
                        className="group hover:bg-muted/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                                {getIntials(lead.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {lead.name || "Unnamed lead"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {lead.email || "No email"} •{" "}
                                {lead.phone || "No phone"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-foreground">
                              <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{lead.phone || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              <span className="truncate">
                                {lead.email || "-"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {lead.serviceRequested || "-"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>
                                {lead.remarks?.trim()
                                  ? "Has remarks"
                                  : "No remarks"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        <TableCell>{getSourceBadge(lead.source)}</TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(lead.createdAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 rounded-2xl"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.info(
                                    "Edit lead action can open your edit dialog",
                                  )
                                }
                                className="rounded-xl"
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(lead)}
                                className="rounded-xl text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page{" "}
                  <span className="font-medium text-foreground">{page}</span>
                </p>

                <div className="flex gap-2">
                  <Button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    variant="outline"
                    className="rounded-2xl"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete this lead?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The lead will be removed permanently
              from the system.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => deleteTarget && handleDeleteLead(deleteTarget._id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
