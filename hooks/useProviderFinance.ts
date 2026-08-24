"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useProviderFinance(
  period = "30d",
) {
  return useQuery({
    queryKey: [
      "provider-finance",
      period,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/finance?period=${period}`,
        );

      return data;
    },

    refetchInterval: 30000,

    refetchOnWindowFocus: true,
  });
}