"use client";
import api from "@/lib/api";
import {keepPreviousData, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

export function useLeads(page = 1, limit = 20, q = "") {
  return useQuery({
    queryKey: ["leads", { page, limit, q }],
    queryFn: async () => {
      const url = `/leads?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const { data } = await api.get(url);
      return data;
    },
    keepPreviousData: true,
    staleTime: 1000 * 10,
  });
};


export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/leads", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
};

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
      const { data } = await api.put(`/leads/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/leads/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
};

export function useCustomers(page = 1, limit = 50, q = "") {
  return useQuery({
    queryKey: ["customers", page, limit, q],
    queryFn: async () => {
      const { data } = await api.get(`/customers?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`);
      return data;
    },
  });
}

export function useTechnicians(page = 1, limit = 50) {
  return useQuery({
    queryKey: ["technicians", page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/add-technicians?page=${page}&limit=${limit}`);
      return data;
    },
  });
}