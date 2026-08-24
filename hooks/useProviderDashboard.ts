"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useProviderDashboard() {
  return useQuery({
    queryKey: ["provider-dashboard"],

    queryFn: async () => {
      const { data } = await api.get(
        "/service-provider/dashboard"
      );

      return data;
    },

    refetchInterval: 15000,

    refetchOnWindowFocus: true,
  });
}