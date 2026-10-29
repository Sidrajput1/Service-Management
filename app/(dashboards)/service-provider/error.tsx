"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="provider-panel">
      <h1 className="text-xl font-bold">
        Your business information is temporarily unavailable
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Please refresh this page to try again.
      </p>
      <Button className="mt-5 h-11" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
