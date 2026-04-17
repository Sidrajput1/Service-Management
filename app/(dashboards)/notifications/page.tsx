'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';
import React from 'react'

function NotificationPage() {
    const {data,isLoading} = useNotifications(100);
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const notifications = data?.notifications || [];
    return(
     <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
            <p className="mt-2 text-sm text-slate-300">
              All your important updates in one place.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent updates</CardTitle>
            <Button variant="outline" onClick={() => markAllRead.mutate()}>
              Mark all as read
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif: any) => (
                <div
                  key={notif._id}
                  className={`rounded-2xl border p-4 ${
                    notif.status === "unread" ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-900">{notif.title}</div>
                        <Badge variant="secondary">{notif.type}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{notif.message}</div>
                      <div className="mt-2 text-xs text-slate-400">
                        {new Date(notif.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {notif.status === "unread" ? (
                      <Button size="sm" onClick={() => markRead.mutate(notif._id)}>
                        Mark read
                      </Button>
                    ) : (
                      <Badge>Read</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default NotificationPage;