"use client";
import { useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
export function useFinanceQuery<T>(path: string, enabled = true) {
  const { data: session, status } = useSession();
  return useQuery({
    queryKey: ["finance", session?.user.id, session?.user.role, path],
    enabled: enabled && status === "authenticated",
    queryFn: async ({ signal }) => (await api.get<T>(path, { signal })).data,
    gcTime: 0,
    staleTime: 0,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
}
export function useFinanceAction<T = Record<string, unknown>>(
  path: string,
  method: "post" | "put" = "post",
) {
  const { data: session } = useSession(),
    client = useQueryClient(),
    gate = useRef(false),
    attempt = useRef<{ body: string; requestId: string } | null>(null);
  const mutation = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (body: Record<string, unknown>) => {
      const key = JSON.stringify(body);
      if (attempt.current?.body !== key)
        attempt.current = { body: key, requestId: crypto.randomUUID() };
      const result = (
        await api[method]<T>(path, {
          ...body,
          requestId: attempt.current.requestId,
        })
      ).data;
      attempt.current = null;
      return result;
    },
    onSuccess: async () => {
      // A saved financial command must not be repeated because a UI refresh failed.
      try {
        await client.cancelQueries({
          predicate: (q) =>
            q.queryKey[0] === "finance" && q.queryKey[1] === session?.user.id,
        });
        await client.invalidateQueries({
          predicate: (q) =>
            q.queryKey[0] === "finance" && q.queryKey[1] === session?.user.id,
        });
        await client.invalidateQueries({
          predicate: (q) =>
            typeof q.queryKey[0] === "string" &&
            [
              "technician-job",
              "technician-jobs",
              "provider-booking-requests",
              "provider-booking",
              "provider-bookings",
              "provider-assigned-job",
              "provider-assigned-jobs",
              "customer-booking",
              "customer-bookings",
            ].includes(q.queryKey[0]),
        });
      } catch {
        /* Query errors are displayed by their existing readers. */
      }
    },
  });
  return {
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    mutateAsync: async (body: Record<string, unknown>) => {
      if (gate.current)
        throw new Error("A financial request is already running.");
      gate.current = true;
      try {
        return await mutation.mutateAsync(body);
      } finally {
        gate.current = false;
      }
    },
  };
}
