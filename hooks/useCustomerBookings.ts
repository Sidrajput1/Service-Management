"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useCustomerScope } from "@/hooks/useCustomerScope";

export function useNewCustomerBookings(
  status = "all",
  cursor?: string,
) {
  const scope = useCustomerScope();
  return useQuery({
    queryKey: [
      "customer-bookings",
      status,
      cursor, scope.userId,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/customer/bookings?${new URLSearchParams({ status, limit: "12", ...(cursor ? { cursor } : {}) })}`,
        );

      return data;
    },

    refetchInterval: 15000,
    enabled: scope.enabled,

    refetchOnWindowFocus: true,
  });
}

export function useNewCustomerBooking(
  bookingId: string,
) {
  const scope = useCustomerScope();
  return useQuery({
    queryKey: [
      "customer-booking",
      bookingId,
      scope.userId,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/customer/bookings/${bookingId}`,
        );

      return data;
    },

    enabled: scope.enabled && Boolean(bookingId),

    /*
     * Important because technician/job
     * status can change while customer
     * is watching the page.
     */

    refetchInterval: 10000,

    refetchOnWindowFocus: true,
  });
}
