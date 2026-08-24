"use client";

import {  Inbox } from "lucide-react";
import { Badge } from "./badge";

export function statusBadge(status?: string) {
  const value = (status || "new").toLowerCase();

  if (value.includes("completed")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Completed
      </Badge>
    );
  }

  if (value.includes("cancel")) {
    return (
      <Badge className="rounded-full border-rose-500/20 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400">
        Cancelled
      </Badge>
    );
  }

  if (value.includes("progress") || value.includes("active")) {
    return (
      <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400">
        In Progress
      </Badge>
    );
  }

  if (value.includes("assigned") || value.includes("confirm")) {
    return (
      <Badge className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/10 dark:text-violet-400">
        Assigned
      </Badge>
    );
  }

  if (value.includes("pending")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        Pending
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
      {status || "New"}
    </Badge>
  );
}

export function paymentBadge(status?: string) {
  const value = (status || "unbilled").toLowerCase();

  if (value.includes("paid")) {
    return (
      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Paid
      </Badge>
    );
  }

  if (value.includes("pending")) {
    return (
      <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        Pending
      </Badge>
    );
  }

  if (value.includes("billed")) {
    return (
      <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400">
        Billed
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
      Unbilled
    </Badge>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}