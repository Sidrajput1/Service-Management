"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import api from "@/lib/api";
export interface ConversationSummary { _id: string; subject?: string; jobId?: string; bookingId?: string; lastMessageText?: string; lastMessageAt?: string; isClosed?: boolean; participants: { userId: string; unreadCount?: number }[] }
export interface ChatMessage { _id: string; conversationId: string; senderId: string; senderRole: string; text: string; attachments?: { url: string; name?: string }[]; createdAt: string }
interface MessagePage { conversation: ConversationSummary; messages: ChatMessage[]; nextCursor: string | null }
export function useConversations(cursor?: string) {
  const { data: session } = useSession();
  return useQuery({ queryKey: ["conversations", cursor, session?.user.id], enabled: Boolean(session?.user.id), queryFn: async () => (await api.get<{ conversation: ConversationSummary[]; nextCursor: string | null }>(`/chats/conversations?${new URLSearchParams({ limit: "15", ...(cursor ? { cursor } : {}) })}`)).data, refetchInterval: 15000 });
}
export function useJobConversation(jobId: string, open: boolean) {
  const { data: session } = useSession();
  return useQuery({ queryKey: ["job-conversation", jobId, session?.user.id], enabled: open && Boolean(jobId && session?.user.id), queryFn: async () => (await api.post<{ conversation: ConversationSummary }>("/chats/conversations/ensure", { type: "job", jobId })).data });
}
export function useChatHistory(conversationId: string) {
  const { data: session } = useSession();
  return useInfiniteQuery({ queryKey: ["chat-history", conversationId, session?.user.id], enabled: Boolean(conversationId && session?.user.id), initialPageParam: undefined as string | undefined, queryFn: async ({ pageParam }) => (await api.get<MessagePage>(`/chats/conversations/${conversationId}/message?${new URLSearchParams({ limit: "30", ...(pageParam ? { cursor: pageParam } : {}) })}`)).data, getNextPageParam: page => page.nextCursor || undefined, refetchInterval: 15000, refetchOnReconnect: "always" });
}
export function useSendChatMessage(conversationId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (payload: { text: string; clientMessageId: string }) => (await api.post<{ message: ChatMessage }>(`/chats/conversations/${conversationId}/message`, payload)).data, onSuccess: () => { client.invalidateQueries({ queryKey: ["chat-history", conversationId] }); client.invalidateQueries({ queryKey: ["conversations"] }); } });
}
export function useReadConversation(conversationId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => api.post(`/chats/conversations/${conversationId}/read`), onSuccess: () => client.invalidateQueries({ queryKey: ["conversations"] }) });
}
export function useChatConnection(conversationId: string) {
  const [connected, setConnected] = useState(false);
  const client = useQueryClient();
  const { data: session } = useSession();
  useEffect(() => {
    if (!session?.user.id || !conversationId) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, { withCredentials: true, reconnection: true, reconnectionDelayMax: 10000 });
    const refresh = () => { client.invalidateQueries({ queryKey: ["chat-history", conversationId] }); client.invalidateQueries({ queryKey: ["conversations"] }); };
    socket.on("connect", () => { socket.emit("conversation:join", { conversationId }, (result: { ok: boolean }) => setConnected(Boolean(result?.ok))); refresh(); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("message:new", refresh);
    socket.on("conversation:update", refresh);
    return () => { socket.emit("conversation:leave", { conversationId }); socket.disconnect(); };
  }, [conversationId, session?.user.id, client]);
  return connected;
}
