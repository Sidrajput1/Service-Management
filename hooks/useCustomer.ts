"use client";

import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomerScope } from "@/hooks/useCustomerScope";

export function useCustomerMe(){
    const scope = useCustomerScope();
    return useQuery({
        queryKey:["Customer-me"],
        enabled: scope.enabled,
        queryFn: async () => {
            const {data} = await api.get("/customer/me");
            return data;
        }
    })
};


export function useCustomerDashboard(){
    // return useQuery({
    //     queryKey:["customer-dashboard"],
    //     queryFn:async () => {
    //         const {data} = await api.get("/customer/dashboard");
    //         return data;
    //     },
    //     staleTime:0,
    //     refetchOnMount:"always",
    //     refetchOnWindowFocus:true,
    // });

    return useQuery({
    queryKey: [
      "customer-dashboard",
    ],

    queryFn: async () => {
      const { data } =
        await api.get(
          "/customer/dashboard",
        );

      return data;
    },

    refetchInterval:
      30000,

    refetchOnWindowFocus:
      true,
  });
};

export function useCreateCustomerRequest(){
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (payload:any) => {
            const {data} = await api.post("/customer/reqforservice",payload);
            return data;
        },
        onSuccess:() => {
            qc.invalidateQueries({queryKey:["customer-dashboard"]});
        }
    })
};

export function useCustomerJobs(){
    return useQuery({
        queryKey:["Customer-jobs"],
        queryFn:async () => {
            const {data} = await api.get("/customer/jobs");
            return data;
        }
    })
};

export function useCustomerJobById(id?:string){
    return useQuery({
        queryKey:["customer-jobbyid",id],
        queryFn:async() => {
            const {data} = await api.get(`/customer/jobs/${id}`);
            return data;
        },
        enabled:!!id,
    })
};

export function useCustomerInvoice(cursor?: string){
    const scope = useCustomerScope();
    return useQuery({
        queryKey:["customer-invoices", cursor, scope.userId],
        enabled: scope.enabled,
        queryFn:async () => {
            const {data} = await api.get(`/customer/invoices?${new URLSearchParams({ limit: "12", ...(cursor ? { cursor } : {}) })}`);
            return data;
        }
    })
};

export function useCustomerInvoiceById(id?:string){
    const scope = useCustomerScope();
    return useQuery({
        queryKey:["customer-invoicebyid",id,scope.userId],
        queryFn:async () => {
            const {data} = await api.get(`/customer/invoices/${id}`);
            return data;
        },
        enabled:scope.enabled && !!id,
        staleTime: 0,
        refetchInterval: 10000,
    })
};

export function useUpdateCustomerProfile(){
    const qc = useQueryClient();
    return useMutation({
        mutationFn:async (payload:any) => {
            const {data} = await api.put("/customer/profile",payload);
            return data;
        },
        onSuccess:() => {
            qc.invalidateQueries({queryKey:["Customer-me"]});
            qc.invalidateQueries({queryKey:["profile"]});
            qc.invalidateQueries({queryKey:["customer-dashboard"]});
        },
    });
};

export function useCustomerBooking(){
    return useQuery({
        queryKey:["customer-bookings"],
        queryFn:async () => {
            const {data} = await api.get("/customer/bookings");
            return data;
        }
    })
};

export function useCustomerBookingsById(id?:string){
    return useQuery({
        queryKey:["customer-booking",id],
        queryFn:async () => {
            const {data} = await api.get(`/customer/bookings/${id}`);
            return data;
        },
        enabled:!!id,
    })
}
