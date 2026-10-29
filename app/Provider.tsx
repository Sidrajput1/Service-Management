"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { useState, type ReactNode } from "react";

function QueryBoundary({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 0, refetchOnWindowFocus: true } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function ScopedQueries({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  // Separate cache lifetimes prevent private data surviving an account switch.
  return <QueryBoundary key={status === "loading" ? "loading" : session?.user?.id || "guest"}>{children}</QueryBoundary>;
}
export default function Provider({ children }: { children: ReactNode }) {
  return <SessionProvider><ScopedQueries>{children}</ScopedQueries></SessionProvider>;
}
