import type { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
export interface NotificationRecord {
  _id: string;
  title: string;
  message: string;
  type: string;
  status: "read" | "unread";
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}
export interface NotificationFeed {
  notifications: NotificationRecord[];
  unreadCount: number;
  nextCursor?: string | null;
}
export const notificationSignalKey: string;
export function notificationBadge(count: unknown): {
  text: string | null;
  label: string;
};
export function notificationFeed(value: unknown): NotificationFeed;
export function safeNotificationLink(value: unknown, role?: string): string;
export function notificationQueryOptions(
  userId: string | undefined,
  fetcher: (path: string, options: { signal: AbortSignal }) => Promise<unknown>,
  options?: { limit?: number; cursor?: string; unreadOnly?: boolean },
): {
  queryKey: (string | number | undefined)[];
  queryFn: (context: QueryFunctionContext) => Promise<NotificationFeed>;
  staleTime: number;
  gcTime: number;
  refetchInterval: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: "always";
};
export function refreshNotifications(
  client: Pick<QueryClient, "invalidateQueries">,
  userId?: string,
): Promise<unknown>;
export function cancelNotificationReads(
  client: Pick<QueryClient, "cancelQueries">,
  userId?: string,
): Promise<unknown>;
export function notificationWriteConfirmed(
  client: QueryClient,
  userId?: string,
): Promise<void>;
export function subscribeNotificationUpdates(
  client: QueryClient,
  userId?: string,
  events?: Pick<Window, "addEventListener" | "removeEventListener">,
): () => void;
export function publishNotificationChange(
  userId?: string,
  storage?: Pick<Storage, "setItem">,
): void;
