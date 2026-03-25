"use client";

import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useBookings(page = 1, limit = 20, q = ""){
    return useQuery({
        queryKey:["bookings",page,limit,q],
        queryFn: async() => {
            const {data} = await api.get(`/bookings?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`);
            return data;
        },
    })
};


export function useCreateBooking(){
    const qc = useQueryClient();

    return useMutation({
        mutationFn:async(payload:any) => {
            const {data} = await api.post('/bookings',payload);
            return data;
        },
        onSuccess:() => {
            qc.invalidateQueries({queryKey:["bookings"]});
        },
    })
};

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/bookings/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/bookings/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}