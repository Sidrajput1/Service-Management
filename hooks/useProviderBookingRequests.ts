"use client";

import api from "@/lib/api";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Address } from "@/lib/customer-types";

export interface ProviderBookingRequest {
  _id: string;
  serviceName: string;
  customerId?: { name?: string };
  serviceOfferingId?: { _id?: string; name?: string };
  address?: Address;
  preferredDate?: string;
  description?: string;
  pricing?: { finalPrice?: number };
  coverage: {
    status: "matched" | "outside" | "uncertain";
    currentStatus: string;
    requiresProviderConfirmation: boolean;
  };
  coverageReviewToken: string;
}
interface RequestPage {
  requests: ProviderBookingRequest[];
  nextCursor: string | null;
}

export function useProviderBookingRequests() {
  const { data: session, status } = useSession();
  const query = useInfiniteQuery({
    queryKey: ["provider-booking-requests", session?.user?.id],
    enabled:
      status === "authenticated" && session?.user?.role === "service_provider",
    initialPageParam: "",
    getNextPageParam: (page: RequestPage) => page.nextCursor || undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<RequestPage>(
        `/service-provider/booking-requests?limit=20${pageParam ? `&cursor=${pageParam}` : ""}`,
      );
      return data;
    },
    refetchInterval: 15000,
    gcTime: 0,
  });
  return {
    ...query,
    requests: query.data?.pages.flatMap((page) => page.requests) || [],
  };
}

export function useAcceptBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      ...confirmation
    }: {
      requestId: string;
      confirmOutOfArea?: boolean;
      coverageReviewToken: string;
    }) => {
      const { data } = await api.post(
        `/service-provider/booking-requests/${requestId}/accept`,
        confirmation,
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-booking-requests"],
      });

      queryClient.invalidateQueries({
        queryKey: ["provider-dashboard"],
      });
    },
  });
}

export function useDeclineBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) =>
      (
        await api.post(
          `/service-provider/booking-requests/${requestId}/decline`,
          {},
        )
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-booking-requests"],
      });
      queryClient.invalidateQueries({ queryKey: ["provider-dashboard"] });
    },
  });
}
