import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function useProviderBooking(
  status = "all"
) {
  return useQuery({
    queryKey: [
      "provider-bookings",
      status,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/bookings?status=${status}`
        );

      return data;
    },

    refetchInterval: 15000,

    refetchOnWindowFocus: true,
  });
}