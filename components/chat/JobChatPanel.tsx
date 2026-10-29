"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useJobConversation } from "@/hooks/useChat";
import ChatWindow, { type ChatWindowProps } from "./ChatWindow";
export default function JobChatPanel({ jobId, triggerLabel = "Open chat", ...props }: Omit<ChatWindowProps, "conversationId"> & { jobId: string; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const query = useJobConversation(jobId, open);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button className="public-button public-button-primary" />}><MessageCircle className="size-4" />{triggerLabel}</DialogTrigger><DialogContent className="w-[calc(100%_-_2rem)]! max-w-210! max-h-[94dvh] overflow-y-auto rounded-3xl p-4 sm:p-6"><DialogTitle className="pr-9 text-lg font-bold">Your service conversation</DialogTitle><DialogDescription className="pr-8 text-xs leading-6">Messages are saved with this job and shared with its authorized service participants.</DialogDescription>{query.isLoading ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">Opening your conversation…</p> : query.isError ? <div role="alert" className="rounded-xl bg-primary/5 p-6"><p className="text-sm leading-7 text-primary">Chat is unavailable. A Pro must be assigned and linked to the job before a job conversation can begin.</p><Button variant="outline" className="mt-4 h-11" onClick={() => query.refetch()}>Try again</Button></div> : query.data?.conversation && <ChatWindow key={query.data.conversation._id} conversationId={query.data.conversation._id} {...props} />}</DialogContent></Dialog>;
}
