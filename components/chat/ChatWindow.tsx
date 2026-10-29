"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatHistory, useSendChatMessage, useReadConversation, useChatConnection } from "@/hooks/useChat";
import { dateTime } from "@/lib/customer-types";
export type ChatWindowProps = { conversationId: string; currentUserId: string; currentUserRole: "admin" | "dispatcher" | "technician" | "customer"; currentUserName?: string; className?: string };
function safeAttachment(url: string) { try { return new URL(url).protocol === "https:" ? url : null; } catch { return null; } }
export default function ChatWindow({ conversationId, currentUserId, className = "" }: ChatWindowProps) {
  const history = useChatHistory(conversationId);
  const send = useSendChatMessage(conversationId);
  const read = useReadConversation(conversationId);
  const connected = useChatConnection(conversationId);
  const [text, setText] = useState("");
  const retryKey = useRef("");
  const listRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(() => [...new Map((history.data?.pages || []).slice().reverse().flatMap(page => page.messages).map(message => [message._id, message])).values()], [history.data]);
  const latestId = messages.at(-1)?._id;
  const markRead = read.mutate;
  useEffect(() => { if (latestId) markRead(); }, [latestId, markRead]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [latestId]);
  const conversation = history.data?.pages[0]?.conversation;
  async function submit() {
    if (!text.trim() || send.isPending) return;
    retryKey.current ||= crypto.randomUUID();
    try { await send.mutateAsync({ text: text.trim(), clientMessageId: retryKey.current }); setText(""); retryKey.current = ""; } catch { /* Text and retry key remain available for a safe retry. */ }
  }
  return <section className={`flex h-[min(72dvh,720px)] min-h-105 flex-col overflow-hidden rounded-2xl border border-border bg-card ${className}`} aria-label="Service conversation"><header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="size-4 text-primary" />{conversation?.subject || "Service conversation"}</h2><p className="mt-1 text-[11px] text-muted-foreground">{connected ? "Connected · updates arrive in real time" : "Periodic refresh · messages remain available"}</p></div><Button variant="ghost" className="size-11" aria-label="Refresh messages" onClick={() => history.refetch()}><RefreshCw className={`size-4 ${history.isFetching ? "animate-spin" : ""}`} /></Button></header>
    <div className="flex-1 overflow-y-auto px-4 py-5" ref={listRef} role="log" aria-live="polite" aria-relevant="additions text">{history.hasNextPage && <div className="mb-5 text-center"><Button variant="outline" className="h-11 px-4" disabled={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>{history.isFetchingNextPage ? "Loading history…" : "Load earlier messages"}</Button></div>}{history.isLoading && <p role="status" className="text-center text-sm text-muted-foreground">Loading messages…</p>}{history.isError && <p role="alert" className="mb-5 rounded-xl bg-primary/5 p-4 text-sm text-primary">Message history is temporarily unavailable. Use Refresh messages to try again.</p>}{!history.isLoading && !history.isError && !messages.length && <p className="py-12 text-center text-sm text-muted-foreground">No messages yet. Say hello to your service team.</p>}<div className="space-y-4">{messages.map(message => <div key={message._id} className={`flex ${message.senderId === currentUserId ? "justify-end" : "justify-start"}`}><article className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.senderId === currentUserId ? "bg-primary/8 text-foreground" : "border border-border bg-muted/40"}`}><p className="mb-1 text-[10px] font-bold text-muted-foreground">{message.senderId === currentUserId ? "You" : message.senderRole === "technician" ? "Pro" : "Service team"}</p><p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.text}</p>{message.attachments?.map((file, index) => safeAttachment(file.url) && <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-xs text-primary underline">{file.name || "View attachment"}</a>)}<time className="mt-2 block text-[10px] text-muted-foreground" dateTime={message.createdAt}>{dateTime(message.createdAt)}</time></article></div>)}</div></div>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="border-t border-border p-4">{send.isError && <p role="alert" className="mb-3 text-xs leading-6 text-primary">Your message wasn’t confirmed. Your text is saved below; send it again to retry safely.</p>}{conversation?.isClosed ? <p className="text-sm text-muted-foreground">This conversation is closed. Its history is still available.</p> : <div className="flex items-end gap-3"><label htmlFor={`chat-${conversationId}`} className="sr-only">Your message</label><textarea id={`chat-${conversationId}`} value={text} maxLength={4000} rows={2} onChange={event => { setText(event.target.value); retryKey.current = ""; }} placeholder="Write a message to your service team…" className="min-w-0 flex-1 resize-none rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring" /><Button type="submit" className="size-12 rounded-xl bg-primary text-primary-foreground" aria-label={send.isPending ? "Sending message" : "Send message"} disabled={send.isPending || !text.trim() || !conversation}><Send className="size-4" /></Button></div>}</form>
  </section>;
}
