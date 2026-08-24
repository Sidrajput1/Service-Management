"use client";

import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// fetch data from /service-provider/onboarding endpoint to check if provider has completed onboarding
export function useProviderOnboarding(){
    return useQuery({
        queryKey:['provider-onboarding'],
        queryFn:async() =>{
            const {data} = await api.get("/service-provider/onboarding");
            return data;
        },
    });
};

// fetch data from /service-provider/services endpoint to get all active platform services/parts that can be selected by a service provider
export function useProviderServices() {
  return useQuery({
    queryKey: ["provider-services"],
    queryFn: async () => {
      const { data } = await api.get(
        "/service-provider/services"
      );

      return data;
    },
  });
}

// save provider service selection to /service-provider/services endpoint
export function useSaveProviderServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      serviceIds: string[]
    ) => {
      const { data } = await api.put(
        "/service-provider/services",
        {
          serviceIds,
        }
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-services"],
      });

      queryClient.invalidateQueries({
        queryKey: ["provider-onboarding"],
      });
    },
  });
}

// fetch data from /service-provider/service-areas endpoint to get all service areas selected by the provider
export function useProviderServiceAreas() {
  return useQuery({
    queryKey: ["provider-service-areas"],
    queryFn: async () => {
      const { data } = await api.get(
        "/service-provider/services-areas"
      );

      return data;
    },
  });
}

// save provider service areas selection to /service-provider/service-areas endpoint
export function useSaveProviderServiceAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      serviceAreas: string[]
    ) => {
      const { data } = await api.put(
        "/service-provider/services-areas",
        {
          serviceAreas,
        }
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-service-areas"],
      });

      queryClient.invalidateQueries({
        queryKey: ["provider-onboarding"],
      });
    },
  });
}

export function useProviderTechnicians() {
  return useQuery({
    queryKey: ["provider-technicians"],
    queryFn: async () => {
      const { data } = await api.get(
        "/service-provider/technicians"
      );

      return data;
    },
  });
}

export function useCreateProviderTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(
        "/service-provider/technicians",
        payload
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-technicians"],
      });
    },
  });
}