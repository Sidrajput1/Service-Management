"use client";

import ChatWindow from "@/components/chat/ChatWindow";
import api from "@/lib/api";
import { useEffect, useState } from "react";

export default function SupportChatPanel({
    subject,
    currentUserId,
    currentUserRole,
    currentUserName,
}:{
    subject:string;
    currentUserId:string;
    currentUserRole:"admin" | "dispatcher" | "technician" | "customer";
    currentUserName?:string
}){
    const [conversationId,setConversationId] = useState("");

    const [loading,setLoading] = useState(true);

    useEffect(() => {
        async function createSupport(){
            setLoading(true);
            try {
                const {data} = await api.post("/chats/conversation/ensure",{
                    type:"support",
                    subject,
                });

                setConversationId(data.conversation._id);

            } finally{
                setLoading(false);
            }
        };

        createSupport();
    },[subject]);

    if(loading){
        return <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500">
            Loading support chat...
        </div>
    }

    return(
         <ChatWindow
                conversationId={conversationId}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                currentUserName={currentUserName}
            />
    )

}