"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
export function useJobStatusConnection(jobId?: string, bookingId?: string) {
  const { data: session } = useSession(),
    client = useQueryClient();
  useEffect(() => {
    if (!session?.user.id || (!jobId && !bookingId)) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelayMax: 10000,
    });
    const refresh = () => {
      for (const key of [
        ["customer-booking", bookingId],
        ["customer-bookings"],
        ["technician-job", jobId],
        ["technician-jobs"],
        ["notifications"],
        ["notifications-unread"],
      ])
        void client.invalidateQueries({ queryKey: key });
    };
    const update = (value: { jobId?: string; bookingId?: string }) => {
      if (
        (jobId && value.jobId === jobId) ||
        (bookingId && value.bookingId === bookingId)
      )
        refresh();
    };
    socket.on("connect", refresh);
    socket.on("job:status", update);
    return () => {
      socket.disconnect();
    };
  }, [session?.user.id, jobId, bookingId, client]);
}
