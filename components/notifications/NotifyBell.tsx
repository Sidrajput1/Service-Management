"use client";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotifications,
} from "@/hooks/useNotifications";
import {
  notificationBadge,
  safeNotificationLink,
} from "@/lib/notification-client.mjs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function NotifyBell() {
  const query = useUnreadNotifications();
  const { data: session } = useSession();
  const read = useMarkNotificationRead(),
    readAll = useMarkAllNotificationsRead();
  const badge = notificationBadge(query.data?.unreadCount);
  const known = query.data !== undefined;
  const busy = read.isPending || readAll.isPending;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="relative size-11 shrink-0 rounded-xl"
            aria-label={
              query.isLoading
                ? "Notifications, loading unread count"
                : badge.label
            }
          />
        }
      >
        <Bell className="size-5" aria-hidden="true" />
        {badge.text && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
          >
            {badge.text}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(90vw,23rem)]! rounded-2xl p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-3 px-3 py-2 text-foreground">
            <span className="text-sm font-semibold">Notifications</span>
            <span
              className="text-xs font-normal text-muted-foreground"
              aria-live="polite"
            >
              {known ? `${query.data.unreadCount} unread` : "Count unavailable"}
            </span>
          </DropdownMenuLabel>
          {query.isError && (
            <p
              role="status"
              className="px-3 py-2 text-xs leading-5 text-muted-foreground"
            >
              {known
                ? "Showing the last known count. Updates are temporarily unavailable."
                : "Notifications could not be loaded."}
            </p>
          )}
          {query.isLoading && (
            <p
              role="status"
              className="px-3 py-4 text-sm text-muted-foreground"
            >
              Loading notifications…
            </p>
          )}
          {known && query.data.notifications.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No unread notifications.
            </p>
          )}
          {query.data?.notifications.map((item) => (
            <DropdownMenuItem
              key={item._id}
              render={
                <Link
                  href={safeNotificationLink(
                    item.actionUrl,
                    session?.user?.role,
                  )}
                />
              }
              className="min-h-16 items-start rounded-xl p-3"
              onClick={() => {
                if (!busy)
                  read.mutate(item._id, {
                    onError: () =>
                      toast.error(
                        "The notification could not be marked read. Try again.",
                      ),
                  });
              }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-5">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.message}
                </p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {query.data?.unreadCount ? (
          <DropdownMenuItem
            className="min-h-11 rounded-lg"
            disabled={busy}
            onClick={() =>
              readAll.mutate(undefined, {
                onError: () =>
                  toast.error(
                    "Notifications could not be marked read. Try again.",
                  ),
              })
            }
          >
            <CheckCheck className="size-4" />
            {readAll.isPending ? "Marking read…" : "Mark all read"}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="min-h-11 rounded-lg"
          onClick={() => void query.refetch()}
        >
          <RefreshCw className="size-4" />
          Refresh notifications
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 rounded-lg"
          render={<Link href="/notifications" />}
        >
          View all notifications
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 rounded-lg" render={<Link href="/notifications#push-settings" />}>Browser notification settings</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
