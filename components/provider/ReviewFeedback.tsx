"use client";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type {
  ProviderProfile,
  ProviderOffering,
} from "@/lib/marketplace-types";

export function ResubmitReview({
  url,
  version,
  label = "Resubmit for review",
}: {
  url: string;
  version: number;
  label?: string;
}) {
  const client = useQueryClient(),
    requestId = useRef("");
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        className="mt-3 h-11"
        disabled={pending}
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setError("");
          try {
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requestId: (requestId.current ||= crypto.randomUUID()),
                expectedVersion: version,
              }),
            });
            const data = await response.json();
            if (!response.ok) {
              requestId.current = "";
              throw new Error(data.error || "Unable to resubmit.");
            }
            await Promise.all([
              client.invalidateQueries({ queryKey: ["provider-onboarding"] }),
              client.invalidateQueries({
                queryKey: ["provider-service-offerings"],
              }),
            ]);
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Unable to resubmit. Retry after checking your connection.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Submitting…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
export function ProviderReviewFeedback({
  provider,
}: {
  provider: ProviderProfile;
}) {
  const status = provider.verificationStatus || "pending",
    resubmit = ["changes_requested", "rejected"].includes(status);
  if (status === "verified" && provider.status !== "suspended") return null;
  return (
    <section
      className="mb-6 rounded-xl border border-border bg-muted/40 p-5"
      aria-label="Business review status"
    >
      <h2 className="text-sm font-semibold">
        Business verification:{" "}
        {provider.status === "suspended"
          ? "suspended"
          : status.replaceAll("_", " ")}
      </h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        {resubmit
          ? "Update the saved information requested below, then submit this application again."
          : provider.status === "suspended"
            ? "Your business is paused for new bookings. Contact platform support after addressing the review."
            : provider.onboardingCompletedAt
              ? "Your business application is awaiting review. Individual service offerings have a separate approval process."
              : "Complete onboarding to submit your business for verification."}
      </p>
      {provider.lastReview?.reason && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
          Review feedback: {provider.lastReview.reason}
        </p>
      )}
      {resubmit && (
        <ResubmitReview
          url="/api/service-provider/verification/submit"
          version={provider.reviewVersion || 0}
          label="Resubmit business application"
        />
      )}
    </section>
  );
}
export function OfferingReviewFeedback({
  offering,
}: {
  offering: ProviderOffering;
}) {
  const status = offering.approvalStatus || "pending";
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold capitalize">
        Service approval: {status.replaceAll("_", " ")}
      </p>
      {offering.lastReview?.reason && (
        <p className="mt-2 max-w-2xl whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
          Review feedback: {offering.lastReview.reason}
        </p>
      )}
      {["changes_requested", "rejected"].includes(status) && (
        <ResubmitReview
          url={`/api/service-provider/service-offerings/${offering._id}/submit`}
          version={offering.reviewVersion || 0}
        />
      )}
    </div>
  );
}
