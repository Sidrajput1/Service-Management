"use client";
import { useSession } from "next-auth/react";
export function useProviderScope() {
  const { data, status } = useSession();
  return {
    enabled:
      status === "authenticated" && data.user.role === "service_provider",
    userId: data?.user.id,
  };
}
