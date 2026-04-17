"use client";

import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function useAnalyticsSummary(range:string = "30d"){
    return useQuery({
        queryKey:["analytics-summary",range],
        queryFn:async () => {
            const {data} = await api.get(`admin/analytics/summary?range=${range}`);
            return data;
        }
    })
}