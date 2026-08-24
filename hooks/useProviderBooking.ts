"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import api from "@/lib/api";

export function useProviderBooking(
  bookingId: string
) {
  return useQuery({
    queryKey: [
      "provider-booking",
      bookingId,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/bookings/${bookingId}`
        );

      return data;
    },

    enabled: Boolean(bookingId),
  });
}

// export function useProviderBooking(
//   status = "all"
// ) {
//   return useQuery({
//     queryKey: [
//       "provider-bookings",
//       status,
//     ],

//     queryFn: async () => {
//       const { data } =
//         await api.get(
//           `/service-provider/bookings?status=${status}`
//         );

//       return data;
//     },

//     refetchInterval: 15000,

//     refetchOnWindowFocus: true,
//   });
// }

export function useAssignTechnician(
  bookingId: string
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      technicianId: string
    ) => {
      const { data } =
        await api.post(
          `/service-provider/bookings/${bookingId}/assign-technician`,
          {
            technicianId,
          }
        );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "provider-booking",
          bookingId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "provider-dashboard",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "provider-booking-requests",
        ],
      });
    },
  });
}