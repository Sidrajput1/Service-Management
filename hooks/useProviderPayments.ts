"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useProviderPayments(
  status = "success",
) {
  return useQuery({
    queryKey: [
      "provider-payments",
      status,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/finance/payments?status=${status}`,
        );

      return data;
    },

    refetchInterval: 30000,

    refetchOnWindowFocus: true,
  });
}