"use client";

import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useNotifications(limit=20){
    return useQuery({
        queryKey:["notifications",limit],
        queryFn:async () => {
            const {data} = await api.get(`/notifications?limit=${limit}`);
            return data;
        },
    });
};

// export function useUnreadNotifications(){
//     return useQuery({
//         queryKey:["notifications-unread"],
//         queryFn:async () => {
//             const {data} = await api.get("/notifications?limit=1&unreadOnly=true");
//             return data;
//         },

//         refetchInterval:15000,
//     });
// };

export function useUnreadNotifications() {
  return useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const { data } = await api.get("/notifications?limit=1&unreadOnly=true");
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useMarkNotificationRead(){
    const qc = useQueryClient();
    return useMutation({
        mutationFn:async(id:string) => {
            const {data} = await api.put(`/notifications/${id}`,{status:"read"});
            return data;
        },
        onSuccess:() => {
            qc.invalidateQueries({queryKey:["notifications"]});
            qc.invalidateQueries({queryKey:["notifications-unread"]});
        },
    });
};

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/notifications/mark-all-read");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}