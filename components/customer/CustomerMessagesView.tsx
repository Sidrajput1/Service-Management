"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useConversations } from "@/hooks/useChat";
import ChatWindow from "@/components/chat/ChatWindow";
import { CustomerPageHeading, CustomerState, CursorPager } from "./CustomerUi";
import { dateTime } from "@/lib/customer-types";
import { Button } from "@/components/ui/button";
export function CustomerMessagesView() {
  const [history, setHistory] = useState<string[]>([]);
  const query = useConversations(history.at(-1));
  const [selected, setSelected] = useState("");
  const { data: session } = useSession();
  return <><CustomerPageHeading eyebrow="STAY IN THE LOOP" title="Your messages" description="Keep conversations with your Pro and service team connected to the work. Open a booking to start its job conversation." /><CustomerState loading={query.isLoading} error={query.isError && !query.data} retry={() => query.refetch()} empty={!query.data?.conversation.length && !query.isError} emptyFooter={<CursorPager history={history} change={setHistory} nextCursor={query.data?.nextCursor} />} message="Your job conversations will appear here. Once a Pro is assigned, open your booking and choose Chat with your Pro."><div className="grid gap-5 lg:grid-cols-[.65fr_1.35fr]"><section className={selected ? "hidden lg:block" : ""} aria-label="Conversations"><div className="customer-panel space-y-2 p-3!">{query.data?.conversation.map(conversation => <button key={conversation._id} onClick={() => setSelected(conversation._id)} className={`w-full rounded-xl p-4 text-left ${selected === conversation._id ? "bg-primary/6" : "hover:bg-muted"}`} aria-pressed={selected === conversation._id}><span className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="size-4 text-primary" />{conversation.subject || "Service conversation"}</span><span className="mt-2 block truncate text-xs text-muted-foreground">{conversation.lastMessageText || "Start a conversation"}</span><span className="mt-2 block text-[10px] text-muted-foreground">{dateTime(conversation.lastMessageAt)}</span>{(conversation.participants.find(p => p.userId === session?.user.id)?.unreadCount || 0) > 0 && <span className="mt-2 inline-block rounded-full bg-primary px-2 py-1 text-[10px] text-primary-foreground">Unread messages</span>}</button>)}</div><CursorPager history={history} change={value => { setHistory(value); setSelected(""); }} nextCursor={query.data?.nextCursor} /></section><div className={!selected ? "hidden lg:block" : ""}>{selected && session?.user.id ? <><Button variant="ghost" className="mb-3 h-11 lg:hidden" onClick={() => setSelected("")}><ArrowLeft className="size-4" />All conversations</Button><ChatWindow key={selected} conversationId={selected} currentUserId={session.user.id} currentUserRole="customer" /></> : <div className="public-catalog-state h-full"><MessageCircle className="size-9 text-brand-teal-dark" /><h2 className="text-lg font-semibold">A conversation, kept together</h2><p>Choose a service conversation to read your messages.</p></div>}</div></div></CustomerState></>;
}
