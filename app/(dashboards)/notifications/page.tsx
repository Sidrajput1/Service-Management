"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  Clock3,
  FileText,
  Inbox,
  IndianRupee,
  MessageSquare,
  RefreshCcw,
  Search,
  Sparkles,
  Tag,
  Ticket,
  User2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

function formatDate(date?: string | Date | null) {
  if (!date) return "-";
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

function timeAgo(date?: string | Date | null) {
  if (!date) return "-";
  const diff = Date.now() - new Date(date).getTime();
  if (Number.isNaN(diff)) return "-";

  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

function getTypeMeta(type?: string) {
  const value = (type || "general").toLowerCase();

  if (value.includes("appointment")) {
    return {
      label: "Appointment",
      icon: CalendarDays,
      className:
        "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    };
  }

  if (value.includes("cancellation")) {
    return {
      label: "Cancellation",
      icon: CircleAlert,
      className:
        "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    };
  }

  if (value.includes("bed")) {
    return {
      label: "Bed allocation",
      icon: Ticket,
      className:
        "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    };
  }

  if (value.includes("payment")) {
    return {
      label: "Payment",
      icon: ArrowUpRight,
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }

  if (value.includes("job")) {
    return {
      label: "Job",
      icon: Wrench,
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };
  }

  if (value.includes("message") || value.includes("chat")) {
    return {
      label: "Message",
      icon: MessageSquare,
      className:
        "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    };
  }

  return {
    label: type || "Update",
    icon: Bell,
    className: "border-border bg-muted text-muted-foreground",
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-72 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-90 items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8">
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

function NotificationPage() {
  const { data, isLoading, refetch } = useNotifications(100);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "read" | "unread">(
    "all",
  );

  const [typeFilter, setTypeFilter] = useState("all");

  const notifications = data?.notifications || [];

  console.log("notification data", notifications);

  const enriched = useMemo(() => {
    const q = query.trim().toLowerCase();

    return notifications.filter((notif: any) => {
      const title = (notif.title || "").toLowerCase();
      const message = (notif.message || "").toLowerCase();
      const type = (notif.type || "").toLowerCase();
      const status = (notif.status || "").toLowerCase();
      // add more value in notification 
      const actionUrl = (notif.actionUrl || "").toLowerCase();
       const entityType = (notif.entityType || "").toLowerCase();
    const entityId = (notif.entityId || "").toLowerCase();
    const invoiceNumber = (notif.metadata?.invoiceNumber || "").toLowerCase();
       const amountStr = notif.metadata?.amount ? String(notif.metadata.amount) : "";
       //--------------------------------------
      // const matchesQuery = !q || `${title} ${message} ${type}`.includes(q);
      const matchesQuery =
      !q ||
      `${title} ${message} ${type} ${actionUrl} ${entityType} ${entityId} ${invoiceNumber} ${amountStr}`.includes(q);
      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === status;
      const matchesType = typeFilter === "all" ? true : type === typeFilter;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [notifications, query, statusFilter, typeFilter]);

  //console.log("enriched",enriched);

  const summary = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(
      (n: any) => (n.status || "").toLowerCase() === "unread",
    ).length;
    const read = notifications.filter(
      (n: any) => (n.status || "").toLowerCase() === "read",
    ).length;

    const byType = notifications.reduce(
      (acc: Record<string, number>, n: any) => {
        const key = (n.type || "general").toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {},
    );

    const topType =
      Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || "general";

    return { total, unread, read, topType };
  }, [notifications]);

  async function handleMarkRead(id: string) {
    try {
      await markRead.mutateAsync(id);
      toast.success("Notification marked as read");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark notification");
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark all notifications");
    }
  }

  return (
    <div className="space-y-8 bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Notification inbox
          </div>
          <div>
            <h1 className="font-poppins text-3xl font-semibold tracking-tight">
              Notifications
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Keep track of jobs, payments, appointments, and system updates in
              one clean inbox.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-2xl"
            onClick={() => refetch?.()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
            onClick={handleMarkAllRead}
            disabled={!summary.unread || markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Total</p>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Live
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary.total}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                All notifications loaded.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <CircleAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Unread</p>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Needs attention
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary.unread}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Waiting to be reviewed.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <CheckCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Read</p>
                <span className="text-xs font-medium text-muted-foreground">
                  Reviewed
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {summary.read}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Already seen by the user.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Top type</p>
                <span className="text-xs font-medium text-muted-foreground">
                  Most common
                </span>
              </div>
              <p className="mt-1 truncate text-2xl font-semibold tracking-tight capitalize">
                {summary.topType}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Most frequent notification type.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main inbox */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                Recent updates
              </CardTitle>
              <CardDescription>
                Search, filter, and manage all alerts from one place.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-11 rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All statuses</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-11 rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All types</option>

                <option value="cancellation">Cancellation</option>

                <option value="payment">Payment</option>
                <option value="job">Job</option>
                <option value="message">Message</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              Inbox
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              Alerts
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              Activity
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted text-muted-foreground"
            >
              Updates
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : enriched.length === 0 ? (
            <EmptyState
              title="No notifications found"
              description="Try changing the search query or filters to narrow down the list."
              action={
                <Button
                  className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {enriched.map((notif: any) => {
                const meta = getTypeMeta(notif.type);
                const TypeIcon = meta.icon;
                const unread = (notif.status || "").toLowerCase() === "unread";

                // safe actionUrl: only allow internal routes
  const actionUrl = notif.actionUrl && notif.actionUrl.startsWith("/")
    ? notif.actionUrl
    : null;
    const invoiceNumber = notif.metadata?.invoiceNumber;
  const amount = notif.metadata?.amount;
  const formattedAmount = typeof amount === "number"
    ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

                return (
                  <div
                    key={notif._id}
                    className={`rounded-3xl border p-5 shadow-sm transition ${
                      unread
                        ? "border-slate-300 bg-slate-50 dark:border-border dark:bg-muted/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-muted/50">
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-foreground">
                                {notif.title || "Notification"}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {timeAgo(notif.createdAt)}
                              </div>
                            </div>
                          </div>

                          <Badge
                            className={`rounded-full border ${meta.className}`}
                          >
                            {meta.label}
                          </Badge>

                          {unread ? (
                            <Badge className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
                              Unread
                            </Badge>
                          ) : (
                            <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
                              Read
                            </Badge>
                          )}
                        </div>

                        <p className="mt-4 text-sm leading-6 text-muted-foreground">
                          {notif.message}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(notif.createdAt)}
                          </span>
                          {invoiceNumber ? (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {invoiceNumber}
              </span>
            ) : null}
            {formattedAmount ? (
              <span className="inline-flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" />
                {formattedAmount}
              </span>
            ) : null}

            {notif.entityType ? (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {notif.entityType}
              </span>
            ) : null}
                          {notif.patient_id || notif.patientId ? (
                            <span className="inline-flex items-center gap-1">
                              <User2 className="h-3.5 w-3.5" />
                              Related record
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {actionUrl ? (
            <Button size="sm" className="h-9 rounded-2xl" asChild>
              <Link href={actionUrl}>
                View
                <ArrowRight className="ml-2 h-4 w-4 inline" />
              </Link>
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              {unread ? (
                <Button size="sm" className="h-9 rounded-2xl" onClick={() => handleMarkRead(notif._id)} disabled={markRead.isPending}>
                  Mark read
                </Button>
              ) : (
                <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">Viewed</Badge>
              )}
            </div>
          )}
        </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {unread ? (
                          <Button
                            size="sm"
                            className="h-9 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                            onClick={() => handleMarkRead(notif._id)}
                            disabled={markRead.isPending}
                          >
                            Mark read
                          </Button>
                        ) : (
                          <Badge className="rounded-full border-border bg-muted text-muted-foreground hover:bg-muted">
                            Viewed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationPage;
