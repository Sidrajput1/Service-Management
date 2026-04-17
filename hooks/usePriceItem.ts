"use client";

import api from "@/lib/api";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

// export function usePriceItem(showInactive=false){
//     return useQuery({
//         queryKey:["price-item",showInactive],
//         queryFn:async () => {
//             const {data} = await api.get(`/price-items${showInactive ? "?showInactive-true" :""}`);
//             return data;
//         },
//     });
// };

export function usePriceItem(options?: { showInactive?: boolean; type?: string; q?: string }) {
  const showInactive = options?.showInactive ?? false;
  const type = options?.type ?? "";
  const q = options?.q ?? "";

  return useQuery({
    queryKey: ["price-items", showInactive, type, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showInactive) params.set("showInactive", "true");
      if (type) params.set("type", type);
      if (q) params.set("q", q);

      const { data } = await api.get(`/price-items${params.toString() ? `?${params.toString()}` : ""}`);
      return data;
    },
  });
}


export function useCreatePriceItem(){
    const qc = useQueryClient();

    return useMutation({
        mutationFn:async (payload:any) => {
            const {data} = await api.post("/price-items",payload);
            return data;
        },

        onSuccess:() => qc.invalidateQueries({queryKey:["price-items"]}),
    });
};

export function useUpdatePriceItem(){
    const qc = useQueryClient();

    return useMutation({
        mutationFn:async ({id,payload} : {id:string; payload:any}) => {
            const {data} = await api.put(`/price-items/${id}`,payload);
            return data;
        },

        onSuccess:() => qc.invalidateQueries({queryKey:["price-items"]}),
    });
};

export function useDeletePriceItem(){
    const qc = useQueryClient();

    return useMutation({
        mutationFn:async(id:string) => {
           
                const {data} = await api.delete(`/price-items/${id}`);
                return data;
            

        },

        onSuccess:() => qc.invalidateQueries({queryKey:["price-items"]}),
    });
}

