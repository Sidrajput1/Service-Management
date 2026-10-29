"use client";
import { useEffect } from "react";
import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  cancelNotificationReads,
  notificationQueryOptions,
  notificationWriteConfirmed,
  subscribeNotificationUpdates,
} from "@/lib/notification-client.mjs";

function useNotificationScope() {
  const { data: session, status } = useSession();
  return {
    userId: session?.user?.id,
    enabled: status === "authenticated" && Boolean(session?.user?.id),
  };
}
function useNotificationUpdates(userId?: string) {
  const client = useQueryClient();
  useEffect(
    () => subscribeNotificationUpdates(client, userId),
    [client, userId],
  );
}
const fetchNotifications = async (
  path: string,
  options: { signal: AbortSignal },
) => (await api.get(path, options)).data;
export function useNotifications(limit = 20, cursor?: string) {
  const scope = useNotificationScope();
  useNotificationUpdates(scope.enabled ? scope.userId : undefined);
  return useQuery({
    ...notificationQueryOptions(scope.userId, fetchNotifications, {
      limit,
      cursor,
    }),
    enabled: scope.enabled,
  });
}
export function useUnreadNotifications() {
  const scope = useNotificationScope();
  useNotificationUpdates(scope.enabled ? scope.userId : undefined);
  return useQuery({
    ...notificationQueryOptions(scope.userId, fetchNotifications, {
      limit: 5,
      unreadOnly: true,
    }),
    enabled: scope.enabled,
  });
}
export function useMarkNotificationRead() {
  const client = useQueryClient(),
    scope = useNotificationScope();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.put(`/notifications/${id}`, { status: "read" })).data,
    onMutate: () => cancelNotificationReads(client, scope.userId),
    onSuccess: () => notificationWriteConfirmed(client, scope.userId),
  });
}
export function useMarkAllNotificationsRead() {
  const client = useQueryClient(),
    scope = useNotificationScope();
  return useMutation({
    mutationFn: async () =>
      (await api.post("/notifications/mark-all-read")).data,
    onMutate: () => cancelNotificationReads(client, scope.userId),
    onSuccess: () => notificationWriteConfirmed(client, scope.userId),
  });
}
