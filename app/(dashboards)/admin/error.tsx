"use client";
import { Button } from "@/components/ui/button";
export default function ErrorView({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="provider-panel">
      <h1 className="text-xl font-semibold">
        We couldn’t load this admin view
      </h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Check your connection and try again. No successful decision is undone by
        reloading.
      </p>
      <Button className="mt-5 h-11" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
