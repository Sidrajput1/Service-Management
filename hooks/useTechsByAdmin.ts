"use client";

import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export  function useAdminTechnicians(q="",status=""){
    return useQuery({
         queryKey:['admin-technicians'],
         queryFn : async  () => {
            const params = new URLSearchParams();
            if(q) params.set("q",q);
            if(status) params.set("status",status);
            const data = api.get(`/admin/technicians${params.toString() ? `?${params.toString()}` : ""}`)
            return data;
         }
    })
};

export function useAdminTechnicansLastJob(){
    return useQuery({
        queryKey:[''],
        queryFn:async () => {

        }
    })
}

export function useAdminTechDetails(id?:string){
    return useQuery({
        queryKey:['admin-technicians-details'],
        queryFn: async () => {
            const data = api.get(`/admin/technicians/${id}`);
            return data;
        },
        enabled:!!id
    })
};

export function useUpdateAdminTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.patch(`/admin/technicians/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-technicians"] });
      qc.invalidateQueries({ queryKey: ["admin-technician-detail"] });
    },
  });
}