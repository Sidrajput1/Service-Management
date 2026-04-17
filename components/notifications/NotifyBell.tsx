"use client";

import { useMarkAllNotificationsRead, useMarkNotificationRead, useUnreadNotifications } from '@/hooks/useNotifications';
import React from 'react'

import { Button } from '../ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function NotifyBell() {
 
    const {data,isLoading} = useUnreadNotifications();

    console.log('unread',data);

    const unreadCount = data?.unreadCount || 0;
    const notifications = data?.notifications || [];

    const markRead = useMarkNotificationRead();

    const markAllRead = useMarkAllNotificationsRead();
  return (
    //  <DropdownMenu>
    //   <DropdownMenuTrigger asChild="true">
    //     <Button variant="outline" size="icon" className="relative rounded-2xl border-slate-200 bg-white">
    //       <Bell className="h-4 w-4" />
    //       {unreadCount > 0 ? (
    //         <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-[10px]">
    //           {unreadCount}
    //         </Badge>
    //       ) : null}
    //     </Button>
    //   </DropdownMenuTrigger>

    //   <DropdownMenuContent align="end" className="w-90 p-0">
    //     <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
    //       <span>Notifications</span>
    //       {unreadCount > 0 ? (
    //         <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
    //           Mark all read
    //         </Button>
    //       ) : null}
    //     </DropdownMenuLabel>

    //     <DropdownMenuSeparator />

    //     <ScrollArea className="h-105">
    //       <div className="space-y-1 p-2">
    //         {notifications.length === 0 ? (
    //           <div className="px-3 py-6 text-center text-sm text-slate-500">
    //             No notifications
    //           </div>
    //         ) : (
    //           notifications.map((notif: any) => (
    //             <DropdownMenuItem
    //             asChild
    //               key={notif._id}
    //               className="cursor-pointer rounded-2xl p-0 focus:bg-transparent"
    //               onSelect={(e) => {
    //                 e.preventDefault();
    //                 markRead.mutate(notif._id);
    //               }}
    //             >
    //               <Link
    //                 href={notif.actionUrl || "#"}
    //                 className={`block w-full rounded-2xl px-3 py-3 ${
    //                   notif.status === "unread" ? "bg-slate-50" : "bg-white"
    //                 }`}
    //               >
    //                 <div className="flex items-start justify-between gap-3">
    //                   <div>
    //                     <div className="text-sm font-medium text-slate-900">{notif.title}</div>
    //                     <div className="mt-1 text-xs text-slate-500">{notif.message}</div>
    //                   </div>
    //                   {notif.status === "unread" ? (
    //                     <div className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
    //                   ) : null}
    //                 </div>
    //                 <div className="mt-2 text-[11px] text-slate-400">
    //                   {new Date(notif.createdAt).toLocaleString()}
    //                 </div>
    //               </Link>
    //             </DropdownMenuItem>
    //           ))
    //         )}
    //       </div>
    //     </ScrollArea>
    //   </DropdownMenuContent>
    // </DropdownMenu>

   <div className="relative group">
      <Link
        href="/notifications"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
        aria-label="Open notifications page"
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {unreadCount > 0 ? (
          <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-[10px]">
            {unreadCount}
          </Badge>
        ) : null}
      </Link>

      <div className="invisible absolute right-0 top-full z-50 mt-2 w-[360px] translate-y-1 rounded-3xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">Notifications</div>
            <div className="text-xs text-slate-500">
              {unreadCount} unread
            </div>
          </div>

          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="mt-1 max-h-105 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">
              No unread notifications
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notif: any) => (
                <Link
                  key={notif._id}
                  href={notif.actionUrl || "/notifications"}
                  onClick={() => markRead.mutate(notif._id)}
                  className={`block rounded-2xl px-3 py-3 transition hover:bg-slate-50 ${
                    notif.status === "unread" ? "bg-slate-50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {notif.title}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {notif.message}
                      </div>
                    </div>

                    {notif.status === "unread" ? (
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    ) : null}
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400">
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

