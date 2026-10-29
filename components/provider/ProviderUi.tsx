"use client";
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
export function ProviderHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
      <div>
        <p className="public-eyebrow">SERVIZATO FOR BUSINESS</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
export function ProviderState({
  loading,
  error,
  retry,
  children,
}: {
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading your business information</span>
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="h-60 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  if (error)
    return (
      <div role="alert" className="provider-panel text-center">
        <p className="mb-4 text-sm">
          We couldn’t load this information. Please try again.
        </p>
        <Button variant="outline" onClick={retry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    );
  return children;
}
export function errorMessage(error: unknown) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.error === "string"
    ? error.response.data.error
    : "We couldn’t save that change. Check your information and try again.";
}
export function Feedback({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border border-border p-4 text-sm leading-6 ${error ? "text-destructive" : "text-secondary-foreground"}`}
    >
      {message}
    </p>
  ) : null;
}
