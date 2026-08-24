"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useNewCustomerBookings(
  status = "all",
) {
  return useQuery({
    queryKey: [
      "customer-bookings",
      status,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/customer/bookings?status=${status}`,
        );

      return data;
    },

    refetchInterval: 15000,

    refetchOnWindowFocus: true,
  });
}

export function useNewCustomerBooking(
  bookingId: string,
) {
  return useQuery({
    queryKey: [
      "customer-booking",
      bookingId,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/customer/bookings/${bookingId}`,
        );

      return data;
    },

    enabled: Boolean(bookingId),

    /*
     * Important because technician/job
     * status can change while customer
     * is watching the page.
     */

    refetchInterval: 10000,

    refetchOnWindowFocus: true,
  });
}