"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { MarketplaceCatalog } from "@/lib/marketplace-types";
import { useProviderScope } from "@/hooks/useProviderScope";

export interface PriceItem {
  _id: string;
  name: string;
  itemType: "service" | "part" | "visit" | "other";
  price: number;
  taxPercent?: number;
  description?: string;
  isActive: boolean;
  categoryKey?: string;
  skillKeys?: string[];
  unit?: string;
}

export function useProviderServiceCatalog() {
  const scope = useProviderScope();
  return useQuery({
    queryKey: ["provider-service-catalog", scope.userId],
    enabled: scope.enabled,
    queryFn: async () => {
      const { data } = await api.get("/service-provider/services");

      return data as MarketplaceCatalog & { selectedServiceIds: string[] };
    },
  });
}
