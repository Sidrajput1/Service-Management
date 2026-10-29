"use client";
import { useQuery } from "@tanstack/react-query";
import { useCustomerScope } from "@/hooks/useCustomerScope";
import api from "@/lib/api";
import type { ServiceRequestSummary } from "@/lib/customer-types";
export function useCustomerRequests(cursor?: string) {
  const scope = useCustomerScope();
  return useQuery({ queryKey: ["customer-requests", cursor, scope.userId], enabled: scope.enabled, queryFn: async () => (await api.get<{ requests: ServiceRequestSummary[]; nextCursor: string | null }>(`/customer/service-requests?${new URLSearchParams({ limit: "12", ...(cursor ? { cursor } : {}) })}`)).data, refetchInterval: 15000 });
}
