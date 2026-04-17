"use client";
import React from "react";
import { Badge } from "../ui/badge";
import { MessageCircle } from "lucide-react";

function ChatBtn({
  job,
  active,
  onSelect,
}: {
  job: any;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const customer = job.bookingId?.customerId;
  return (
    <button
      onClick={() => onSelect(job._id)}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">
            {job.bookingId?.serviceType || "Service job"}
          </div>

          <div
            className={`mt-1 text-sm ${
              active ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {customer?.name || "Customer"} • {customer?.phone || "-"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {job.chatUnreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
              {job.chatUnreadCount}
            </span>
          )}

          <button
            type="button"
            className={`rounded-full p-2 ${
              active ? "bg-white text-slate-950" : "bg-slate-100 text-slate-700"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(job._id);
            }}
          >
            <MessageCircle className="h-4 w-4" />
          </button>

          <Badge className={active ? "bg-white text-slate-950" : ""}>
            {job.status}
          </Badge>
        </div>
      </div>
    </button>
  );
}

export default ChatBtn;
