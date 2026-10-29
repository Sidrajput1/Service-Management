"use client";
import { useQuery } from "@tanstack/react-query";
import { useCustomerScope } from "@/hooks/useCustomerScope";
import api from "@/lib/api";
import { useEffect, useState } from "react";
export function useTrackingClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  return now;
}
export function useProTracking(bookingId: string, enabled: boolean) {
  const scope = useCustomerScope();
  return useQuery({ queryKey: ["pro-tracking", bookingId, scope.userId], enabled: scope.enabled && enabled, queryFn: async () => (await api.get<{ state: "current" | "stale" | "inactive" | "unavailable"; lastUpdated: string | null; coordinates?: [number, number] }>(`/customer/bookings/${bookingId}/tracking`)).data, refetchInterval: 15000, staleTime: 0, gcTime: 0 });
}
