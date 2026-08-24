"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import api from "@/lib/api";

export function useCustomerServices() {
  return useQuery({
    queryKey: ["customer-service-catalog"],

    queryFn: async () => {
      const { data } = await api.get("/customer/services");

      return data;
    },
  });
}

// export function useCustomerServices(
//   search?: string,
// ) {
//   return useQuery({
//     queryKey: [
//       "customer-services",
//       search || "",
//     ],

//     queryFn: async () => {
//       const params = new URLSearchParams();

//       if (search?.trim()) {
//         params.set(
//           "search",
//           search.trim(),
//         );
//       }

//       const { data } =
//         await api.get(
//           `/customer/services?${params.toString()}`,
//         );

//       return data;
//     },

//     enabled: true,

//     staleTime: 60_000,
//   });
// }
export function useCustomerProviders({
  serviceId,
  city,
  pincode,
  latitude,
  longitude,
}: {
  serviceId?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}) {
  return useQuery({
    queryKey: [
      "customer-providers",
      serviceId,
      city,
      pincode,
      latitude,
      longitude,
    ],

    queryFn: async () => {
      const params = new URLSearchParams();

      if (serviceId) {
        params.set("serviceId", serviceId);
      }

      if (city) {
        params.set("city", city);
      }

      if (pincode) {
        params.set("pincode", pincode);
      }

      if (latitude !== undefined && longitude !== undefined) {
        params.set("latitude", String(latitude));

        params.set("longitude", String(longitude));
      }

      const { data } = await api.get(
        `/customer/discovery?${params.toString()}`,
      );

      return data;
    },

    enabled: Boolean(serviceId),
  });
}

export function useCreateServiceRequest() {
  return useMutation({
    mutationFn: async (payload: {
      serviceOfferingId: string;

      address: {
        addressLine: string;
        city: string;
        state?: string;
        pincode: string;

        location?: {
          type: "Point";
          coordinates: [number, number];
        };
      };

      preferredDate?: string;

      description?: string;
    }) => {
      const { data } = await api.post("/customer/service-requests", payload);

      return data;
    },
  });
}
