"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useTechnicianJobs() {
  return useQuery({
    queryKey: ["technician-jobs"],
    queryFn: async () => {
      const { data } = await api.get("/technician/jobs");
      return data;
    },
  });
}

export function useTechnicianJob(id?: string) {
  return useQuery({
    queryKey: ["technician-job", id],
    queryFn: async () => {
      const { data } = await api.get(`/technician/jobs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAcceptTechnicianJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/technician/jobs/${id}/accept`);
      console.log("Accept job response:", data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["technician-jobs"] }),
  });
}

export function useArriveTechnicianJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/technician/jobs/${id}/arrive`);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["technician-jobs"] });
    }
  });
}

export function useStartTechnicianJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, otp }: { id: string; otp: string }) => {
      const { data } = await api.post(`/technician/jobs/${id}/start`, { otp });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["technician-jobs"] }),
  });
}

export function useUploadTechnicianProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/technician/jobs/${id}/proof`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["technician-jobs"] }),
  });
}

export function useCompleteTechnicianJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/technician/jobs/${id}/complete`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["technician-jobs"] }),
  });
}