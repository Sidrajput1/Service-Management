"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface PriceItem {
  _id: string;
  name: string;
  itemType: "service" | "part" | "visit" | "other";
  price: number;
  taxPercent?: number;
  description?: string;
  isActive: boolean;
}

export function useProviderServiceCatalog() {
  return useQuery({
    queryKey: ["provider-service-catalog"],
    queryFn: async () => {
      const { data } = await api.get(
        "/service-provider/services"
      );

      return data as {
        success: boolean;
        services: PriceItem[];
        selectedServiceIds: string[];
      };
    },
  });
}