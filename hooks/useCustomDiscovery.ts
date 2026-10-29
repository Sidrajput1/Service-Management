"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useCustomerScope } from "@/hooks/useCustomerScope";
import {
  discoveryParams,
  discoveryQueryOptions,
} from "@/lib/discovery-query.mjs";
export { discoveryParams };
import type {
  DiscoveryFilters,
  DiscoveryResult,
  MarketplaceCatalog,
} from "@/lib/marketplace-types";


export function useCustomerServices() {
  return useQuery({
    queryKey: ["marketplace-catalog"],
    queryFn: async ({ signal }) =>
      (await api.get<MarketplaceCatalog>("/catalog", { signal })).data,
    staleTime: 60000,
  });
}
export function useCustomerProviders(
  filters: DiscoveryFilters & { public?: boolean },
  enabled = true,
) {
  const scope = useCustomerScope();
  const { public: publicQuery = false, ...search } = filters;
  return useQuery({
    ...discoveryQueryOptions(
      search,
      publicQuery ? "public" : `customer:${scope.userId || "anonymous"}`,
      async (path, options) =>
        (await api.get<DiscoveryResult>(path, options)).data,
    ),
    enabled: enabled && (publicQuery || scope.enabled),
  });
}
export function useTopRatedProviders(
  location: string | DiscoveryFilters,
  enabled = true,
) {
  const filters = typeof location === "string" ? { city: location } : location;
  return useQuery({
    ...discoveryQueryOptions(
      filters,
      "public",
      async (path, options) =>
        (await api.get<DiscoveryResult>(path, options)).data,
      { topRated: true },
    ),
    enabled:
      enabled &&
      Boolean(
        filters.city?.trim() ||
          filters.locality?.trim() ||
          filters.pincode?.trim(),
      ),
  });
}
export function useCreateServiceRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      requestKey: string;
      destinationConfirmed: true;
      serviceOfferingId: string;
      repeatOfBookingId?: string;
      destinationCapture?: import("@/components/customer/DestinationCapture").DestinationCaptureValue;
      address: {
        addressLine: string;
        city: string;
        state?: string;
        locality?: string;
        pincode: string;
      };
      preferredDate?: string;
      description?: string;
      quantity?: number;
    }) => (await api.post("/customer/service-requests", payload)).data,
    onSuccess: () => {
      for (const key of [
        "customer-requests",
        "customer-bookings",
        "customer-dashboard",
      ])
        client.invalidateQueries({ queryKey: [key] });
    },
  });
}
