"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useProviderScope } from "@/hooks/useProviderScope";
import type { ProviderOffering } from "@/lib/marketplace-types";

export interface ServiceOffering {
  _id: string;
  serviceProviderId: string;
  priceItemId:
    | string
    | {
        _id: string;
        name: string;
        itemType: string;
        price: number;
        taxPercent?: number;
      };

  name: string;
  price: number;
  pricingModel?: "fixed" | "starting" | "per_unit" | "quote_required";
  unit?: string;
  taxPercent: number;
  description?: string;

  isActive: boolean;

  offerEnabled: boolean;
  offerName?: string;
  discountType?: "percentage" | "flat";
  discountValue?: number;
  offerStartsAt?: string;
  offerEndsAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PriceCalculation {
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface ServiceOfferingWithPricing extends ServiceOffering {
  pricing?: PriceCalculation;
}

export function useProviderServiceOfferings() {
  const scope = useProviderScope();
  return useQuery({
    queryKey: ["provider-service-offerings", scope.userId],
    enabled: scope.enabled,
    queryFn: async () => {
      const { data } = await api.get("/service-provider/service-offerings");

      return data as {
        success: boolean;
        offerings: ProviderOffering[];
      };
    },
  });
}

export function useCreateProviderServiceOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      priceItemId: string;
      price: number;
      taxPercent: number;
      description?: string;
      pricingModel?: "fixed" | "starting" | "per_unit" | "quote_required";
      unit?: string;

      offerEnabled: boolean;
      offerName?: string;
      discountType?: "percentage" | "flat";
      discountValue?: number;

      offerStartsAt?: string;
      offerEndsAt?: string;
    }) => {
      const { data } = await api.post(
        "/service-provider/service-offerings",
        payload,
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-service-offerings"],
      });

      queryClient.invalidateQueries({
        queryKey: ["provider-onboarding"],
      });
    },
  });
}

export function useUpdateProviderServiceOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => {
      const { data } = await api.patch(
        `/service-provider/service-offerings/${id}`,
        payload,
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-service-offerings"],
      });
    },
  });
}

export function useDisableProviderServiceOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(
        `/service-provider/service-offerings/${id}`,
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["provider-service-offerings"],
      });
    },
  });
}
