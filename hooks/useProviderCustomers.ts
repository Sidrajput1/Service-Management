"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useProviderScope } from "./useProviderScope";
export interface ProviderCustomer {
  _id: string;
  bookingCount: number;
  lastBookingId: string;
  lastBookedAt: string;
  customer?: { name?: string; email?: string; phone?: string };
}
export function useProviderCustomers(cursor?: string) {
  const scope = useProviderScope();
  return useQuery({
    queryKey: ["provider-customers", scope.userId, cursor],
    enabled: scope.enabled,
    queryFn: async () =>
      (
        await api.get<{
          customers: ProviderCustomer[];
          nextCursor: string | null;
        }>(
          `/service-provider/customers?${new URLSearchParams({ limit: "20", ...(cursor ? { cursor } : {}) })}`,
        )
      ).data,
  });
}
