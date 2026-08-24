"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useProviderAssignedJobs(
  status = "all"
) {
  return useQuery({
    queryKey: [
      "provider-assigned-jobs",
      status,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/assigned-jobs?status=${status}`
        );

      return data;
    },

    refetchInterval: 10000,

    refetchOnWindowFocus: true,
  });
}

export function useProviderAssignedJob(
  jobId:string,
) {
  return useQuery({
    queryKey: [
      "provider-assigned-jobs",
      jobId,
      //status,
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          `/service-provider/assigned-jobs/${jobId}`
        );

      return data;
    },

    enabled:Boolean(jobId),

    refetchInterval: 10000,

    refetchOnWindowFocus: true,
  });
}