"use client";

import { useState } from "react";
import ChatBtn from "@/components/chat/ChatBtn";
import ChatWindow from "@/components/chat/ChatWindow";
import { useTechnicianJobs } from "@/hooks/useTechnicianJobs";

export default function TechnicianChatsPage({ session }: any) {
  const { data } = useTechnicianJobs();
  const jobs = data?.jobs || [];

  const [conversationId, setConversationId] = useState("");

  return (
    <div className="flex gap-4">
      
      {/* LEFT SIDE - chat list */}
      <div className="w-1/3 space-y-3">
        {jobs.map((job: any) => (
          <ChatBtn
            key={job._id}
            job={job}
            active={conversationId === job.conversationId}
            onSelect={(id) => setConversationId(id)}
          />
        ))}
      </div>

      {/* RIGHT SIDE - chat window */}
      <div className="flex-1">
        {conversationId ? (
          <ChatWindow
            conversationId={conversationId}
            currentUserId={session.user.id}
            currentUserRole={session.user.role}
            currentUserName={session.user.name}
          />
        ) : (
          <div className="p-6 text-slate-500">
            Select a chat to start conversation
          </div>
        )}
      </div>
    </div>
  );
}