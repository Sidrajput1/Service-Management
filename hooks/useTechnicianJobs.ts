"use client";
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import type {
  TechnicianJobDetailResponse,
  TechnicianMutationResponse,
} from "@/lib/technician-job-types";

function useTechnicianScope() {
  const { data: session, status } = useSession();
  return {
    userId: session?.user.id,
    enabled:
      status === "authenticated" &&
      session?.user.role === "technician" &&
      Boolean(session.user.id),
  };
}
function retryJobQuery(count: number, error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return ![400, 401, 403, 404].includes(status || 0) && count < 1;
}
export function useTechnicianJobs() {
  const scope = useTechnicianScope();
  return useQuery({
    queryKey: ["technician-jobs", scope.userId],
    enabled: scope.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      (await api.get("/technician/jobs", { signal })).data,
    retry: retryJobQuery,
  });
}
export function useTechnicianJob(id?: string) {
  const scope = useTechnicianScope();
  return useQuery({
    queryKey: ["technician-job", id, scope.userId],
    queryFn: async ({ signal }) =>
      (
        await api.get<TechnicianJobDetailResponse>(`/technician/jobs/${id}`, {
          signal,
        })
      ).data,
    enabled: Boolean(id) && scope.enabled,
    gcTime: 0,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: "always",
    retry: retryJobQuery,
  });
}
export function useRefreshTechnicianJob(id: string) {
  const client = useQueryClient(),
    scope = useTechnicianScope();
  return useCallback(
    () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: ["technician-job", id, scope.userId],
        }),
        client.invalidateQueries({
          queryKey: ["technician-jobs", scope.userId],
        }),
      ]),
    [client, id, scope.userId],
  );
}
function useJobMutation<Variables>(
  endpoint: string,
  idOf: (value: Variables) => string,
  body?: (value: Variables) => unknown,
) {
  const client = useQueryClient(),
    scope = useTechnicianScope();
  const reconcile = (_result: unknown, value: Variables) =>
    Promise.all([
      client.invalidateQueries({
        queryKey: ["technician-job", idOf(value), scope.userId],
      }),
      client.invalidateQueries({ queryKey: ["technician-jobs", scope.userId] }),
    ]);
  return useMutation<TechnicianMutationResponse, Error, Variables>({
    mutationFn: async (value) => {
      if (!scope.enabled)
        throw new Error("Sign in with your Pro account before updating a job.");
      const id = idOf(value);
      if (!/^[a-f0-9]{24}$/i.test(id))
        throw new Error("Invalid job reference. Refresh your assigned jobs.");
      return (
        await api.post<TechnicianMutationResponse>(
          `/technician/jobs/${id}/${endpoint}`,
          body?.(value),
        )
      ).data;
    },
    onSuccess: reconcile,
    onError: reconcile,
  });
}
export function useAcceptTechnicianJob() {
  return useJobMutation("accept", (id: string) => id);
}
export function useArriveTechnicianJob() {
  return useJobMutation("arrive", (id: string) => id);
}
export function useStartTechnicianJob() {
  return useJobMutation(
    "start",
    (value: { id: string; otp: string }) => value.id,
    (value) => ({ otp: value.otp }),
  );
}
export function useUploadTechnicianProof() {
  return useJobMutation(
    "proof",
    (value: { id: string; payload: unknown }) => value.id,
    (value) => value.payload,
  );
}
export function useCompleteTechnicianJob() {
  return useJobMutation("complete", (id: string) => id);
}
