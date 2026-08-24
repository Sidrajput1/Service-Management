"use client";

import api from "@/lib/api";

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import { Button } from "../ui/button";
import { Paperclip, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";

type ChatMessage = {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  text: string;
  attachments?: Array<{ url: string; name?: string }>;
  messageType: "text" | "system" | "file";
  createdAt: string;
  updatedAt: string;
};

type ChatWindowProps = {
  conversationId: string;
  currentUserId: string;
  currentUserRole: "admin" | "dispatcher" | "technician" | "customer";
  currentUserName?: string;
  className?: string;
};

export default function ChatWindow({
  conversationId,
  currentUserId,
  currentUserRole,
  currentUserName,
  className = "",
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const socketUrl = useMemo(
    () => process.env.NEXT_PUBLIC_SOCKET_URL || undefined,
    [],
  );

  console.log(process.env.NEXT_PUBLIC_SOCKET_URL);

  useEffect(() => {
    async function loadMessage() {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/chats/conversations/${conversationId}/message`,
        );
        setConversation(data.conversation);
        setMessages(data.messages || []);
      } finally {
        setLoading(false);
      }
    }

    loadMessage();
  }, [conversationId]);

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: {
        user: {
          id: currentUserId,
          role: currentUserRole,
          name: currentUserName || "",
        },
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("conversation:join", { conversationId });
    });

    socket.on("message:new", (message: ChatMessage) => {
      if (String(message.conversationId) !== String(conversationId)) return;

      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(message._id));
        if (exists) return prev;
        return [...prev, message];
      });
    });

    socket.on("conversation:update", (payload: any) => {
      if (String(payload.conversationId) !== String(conversationId)) return;

      setConversation((prev: any) =>
        prev
          ? {
              ...prev,
              lastMessageText: payload.lastMessageText ?? prev.lastMessageText,
              lastMessageAt: payload.lastMessageAt ?? prev.lastMessageAt,
            }
          : prev,
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    conversationId,
    currentUserId,
    currentUserRole,
    currentUserName,
    socketUrl,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function markRead() {
      try {
        await api.post(`/chats/conversations/${conversationId}/read`);
      } catch {
        // ignore
      }
    }

    if (conversationId) markRead();
  }, [conversationId, messages.length]);

  async function sendMessage() {
    const trimmed = text.trim();

    if (!trimmed || sending) return;
    setSending(true);

    try {
      const { data } = await api.post(
        `/chats/conversations/${conversationId}/message`,
        {
          text: trimmed,
        },
      );

      if (data?.message) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => String(m._id) === String(data.message._id),
          );
          if (exists) return prev;
          return [...prev, data.message];
        });
      }

      setText("");
    } finally {
      setSending(false);
    }
  }
  return (
    
    <div className={`flex h-[75vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl ${className}`}>
      
      {/* 🔥 HEADER */}
      <div className="border-b bg-linear-to-r from-slate-950 via-emerald-700 to-teal-600 px-5 py-4 text-white">
        <div className="text-sm font-semibold">
          {conversation?.subject || "Job Chat"}
        </div>
        <div className="text-xs text-white/70">
          Live conversation • {currentUserRole}
        </div>
      </div>

      {/* 🔥 MESSAGES */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
        {loading ? (
          <div className="text-center text-sm text-slate-500">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">
              No messages yet. Start conversation 👇
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const mine =
                String(message.senderId) === String(currentUserId);

              return (
                <div
                  key={message._id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                      mine
                        ? "bg-linear-to-r from-slate-900 to-slate-700 text-white"
                        : "bg-white border border-slate-200 text-slate-900"
                    }`}
                  >
                    {message.text && <div>{message.text}</div>}

                    {/* Attachments */}
                    {message.attachments?.length ? (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`block text-xs underline ${
                              mine ? "text-white/80" : "text-slate-600"
                            }`}
                          >
                            {file.name || "Attachment"}
                          </a>
                        ))}
                      </div>
                    ) : null}

                    <div
                      className={`mt-2 text-[10px] ${
                        mine ? "text-white/60" : "text-slate-400"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 🔥 INPUT AREA */}
      <div className="border-t bg-white p-4">
        <div className="rounded-3xl border bg-slate-50 p-3 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            className="min-h-20 w-full resize-none bg-transparent text-sm outline-none"
          />

          <div className="mt-3 flex justify-end">
            <Button
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              className="rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
