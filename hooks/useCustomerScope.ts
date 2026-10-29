"use client";
import { useSession } from "next-auth/react";
export function useCustomerScope() {
  const { data, status } = useSession();
  return { userId: data?.user?.id, enabled: status === "authenticated" && data?.user?.role === "customer" };
}
