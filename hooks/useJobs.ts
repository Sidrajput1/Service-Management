// hooks/useJobs.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useJobs(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["jobs", page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/jobs?page=${page}&limit=${limit}`);
      return data;
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/jobs", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
  });
}

export function useAssignJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, technicianId }: { id: string; technicianId: string }) => {
      const { data } = await api.post(`/jobs/${id}/assign`, { technicianId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/jobs/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}