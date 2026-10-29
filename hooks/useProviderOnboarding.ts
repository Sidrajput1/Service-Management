"use client";
import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProviderScope } from "./useProviderScope";
import { useProviderServiceCatalog } from "./useProviderServiceCatalog";
import type {
  ProviderProfile,
  CoverageArea,
  ProRecord,
} from "@/lib/marketplace-types";
export function useProviderOnboarding() {
  const scope = useProviderScope();
  return useQuery({
    queryKey: ["provider-onboarding", scope.userId],
    enabled: scope.enabled,
    queryFn: async () =>
      (
        await api.get<{
          onboardingComplete: boolean;
          provider: ProviderProfile;
          progress: Record<string, boolean>;
        }>("/service-provider/onboarding")
      ).data,
  });
}
export const useProviderServices = useProviderServiceCatalog;
export function useSaveProviderServices() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (serviceIds: string[]) =>
      (await api.put("/service-provider/services", { serviceIds })).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["provider-service-catalog"] });
      client.invalidateQueries({ queryKey: ["provider-onboarding"] });
    },
  });
}
export function useProviderServiceAreas() {
  const scope = useProviderScope();
  return useQuery({
    queryKey: ["provider-service-areas", scope.userId],
    enabled: scope.enabled,
    queryFn: async () =>
      (
        await api.get<{ areas: CoverageArea[]; legacy: boolean }>(
          "/service-provider/services-areas",
        )
      ).data,
  });
}
export function useSaveProviderServiceAreas() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (areas: CoverageArea[]) =>
      (await api.put("/service-provider/services-areas", { areas })).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["provider-service-areas"] });
      client.invalidateQueries({ queryKey: ["provider-onboarding"] });
      client.invalidateQueries({ queryKey: ["discovery"] });
    },
  });
}
export function useProviderTechnicians(cursor?: string, q = "") {
  const scope = useProviderScope();
  return useQuery({
    queryKey: ["provider-technicians", scope.userId, cursor, q],
    enabled: scope.enabled,
    queryFn: async () =>
      (
        await api.get<{ technicians: ProRecord[]; nextCursor: string | null }>(
          `/service-provider/technicians?${new URLSearchParams({ limit: "20", q, ...(cursor ? { cursor } : {}) })}`,
        )
      ).data,
  });
}
export function useCreateProviderTechnician() {
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async (payload: {
      name: string;
      phone: string;
      email?: string;
      skillKeys: string[];
      vehicleType?: string;
      creationKey: string;
    }) =>
      (
        await api.post<{
          technician: { id: string };
          temporaryPassword?: string;
          loginEmail?: string;
          credentialExpiresAt?: string;
          credentialUnavailable?: boolean;
        }>("/service-provider/technicians", payload)
      ).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["provider-technicians"] });
      client.invalidateQueries({ queryKey: ["provider-onboarding"] });
    },
  });
}
