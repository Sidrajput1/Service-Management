"use client";

import api from '@/lib/api';
import React, { useEffect, useState } from 'react'
import ChatWindow from './ChatWindow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from '../ui/button';

export default function JobChatPanel({
    jobId,
    currentUserId,
    currentUserRole,
    currentUserName,
    triggerLabel ="Open Chat"
}:{
    jobId:string;
    currentUserId:string;
    currentUserRole:"admin" | "dispatcher" | "technician" | "customer";
    currentUserName?:string;
    triggerLabel?:string;
}) {

    const [open,setOpen] = useState(false);

    const [conversationId,setConversationId] = useState("");

    const [loading,setLoading] = useState(true);
    const [error,setError] = useState("");

    useEffect(() => {
        if (!open || !jobId) return;

    let mounted = true;
        async function ensureConversation(){
            if(!jobId) return;

            setLoading(true);

            try {
                const {data} = await api.post("/chats/conversations/ensure",{
                    type:"job",
                    jobId,
                });
                if (!mounted) return;
                setConversationId(data.conversation._id);
            }catch(err:any){
                if (!mounted) return;
        setError(err?.response?.data?.error || "Chat unavailable.");
            } 
            finally{
               if(mounted) setLoading(false);
            }
        };

        ensureConversation();
        return () => {
      mounted = false;
    };
    },[open,jobId]);

//     if (loading) {
//     return <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500">Loading chat...</div>;
//   }

//   if (!conversationId) {
//     return <div className="rounded-2xl border bg-white p-4 text-sm text-red-500">Chat unavailable.</div>;
//   }


  return (
    // <ChatWindow
    //     conversationId={conversationId}
    //     currentUserId={currentUserId}
    //     currentUserRole={currentUserRole}
    //     currentUserName={currentUserName}
    // />
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-linear-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-700 hover:to-emerald-700">
          <MessageCircle className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl overflow-hidden rounded-3xl border-slate-200 p-0">
        <div className="border-b border-slate-100 bg-linear-to-r from-slate-950 via-emerald-700 to-teal-600 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Job Chat
            </DialogTitle>
            <p className="mt-1 text-sm text-white/75">
              Live conversation for {currentUserRole}
            </p>
          </DialogHeader>
        </div>

        <div className="bg-slate-50 p-4">
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading chat...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {error}
            </div>
          ) : conversationId ? (
            <ChatWindow
              conversationId={conversationId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              currentUserName={currentUserName}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Chat unavailable.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

