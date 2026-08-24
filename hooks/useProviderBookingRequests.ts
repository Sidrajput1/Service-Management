"use client";

import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useProviderBookingRequests(){
    return useQuery({
        queryKey:[
            "provider-bookings-requests",
        ],

        queryFn: async () => {
            const {data} = await api.get("/service-provider/booking-requests");
            return data;
        },
        refetchInterval:1500,
    });
};

export function useAcceptBookingRequest() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      requestId: string
    ) => {
      const { data } =
        await api.post(
          `/service-provider/booking-requests/${requestId}/accept`
        );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "provider-booking-requests",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "provider-dashboard",
        ],
      });
    },
  });
}