"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { useProviderOnboarding } from "@/hooks/useProviderOnboarding";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { ServicePricingManager } from "./ServicePricingManager";
import { ServiceAreasManager } from "./ServiceAreasManager";
import { ProManager } from "./ProManager";
import {
  ProviderHeading,
  ProviderState,
  Feedback,
  errorMessage,
} from "./ProviderUi";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
const steps = [
  { label: "Business", keys: ["businessProfile", "address"] },
  { label: "Services & pricing", keys: ["services"] },
  { label: "Service areas", keys: ["serviceAreas"] },
  { label: "Your Pros", keys: ["team"] },
];
export function ProviderOnboardingView() {
  const query = useProviderOnboarding(),
    router = useRouter();
  const [step, setStep] = useState(0),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const done = steps.map((value) =>
    value.keys.every((key) => query.data?.progress[key]),
  );
  return (
    <>
      <ProviderHeading
        title="Set up your service business"
        description="Save each section as you go. Choose only the services and locations you support, and add the Pros who will carry out the work."
      />
      <ProviderState
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      >
        {query.data?.onboardingComplete && (
          <div className="mb-6 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            Onboarding is complete. You can update these settings at any time.{" "}
            <Link href="/service-provider" className="font-bold underline">
              View your overview
            </Link>
          </div>
        )}
        <nav
          aria-label="Onboarding steps"
          className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {steps.map((value, index) => (
            <button
              type="button"
              key={value.label}
              className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-xs font-semibold ${step === index ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"}`}
              aria-current={step === index ? "step" : undefined}
              onClick={() => setStep(index)}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                {done[index] ? <Check className="size-4" /> : index + 1}
              </span>
              {value.label}
            </button>
          ))}
        </nav>
        <section aria-label={steps[step].label} key={step}>
          {step === 0 ? (
            <BusinessProfileForm embedded />
          ) : step === 1 ? (
            <ServicePricingManager embedded />
          ) : step === 2 ? (
            <ServiceAreasManager embedded />
          ) : (
            <ProManager embedded />
          )}
        </section>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            {done.filter(Boolean).length} of 4 sections complete ·{" "}
            {query.data?.provider.verificationStatus || "Pending"} verification
          </p>
          {step < 3 ? (
            <Button
              className="h-11 px-6"
              disabled={!done[step]}
              onClick={() => setStep(step + 1)}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              className="h-11 px-6"
              disabled={pending || done.some((value) => !value)}
              onClick={async () => {
                setPending(true);
                setError("");
                try {
                  await api.post("/service-provider/onboarding/complete");
                  await query.refetch();
                  router.push("/service-provider");
                } catch (failure) {
                  setError(errorMessage(failure));
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Completing setup…" : "Finish onboarding"}
            </Button>
          )}
        </div>
        <Feedback message={error} error />
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          Completing setup does not bypass provider verification. Public
          discovery includes only active, verified businesses with active
          offerings and coverage.
        </p>
      </ProviderState>
    </>
  );
}
