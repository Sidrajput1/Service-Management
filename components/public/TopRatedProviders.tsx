"use client";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useTopRatedProviders } from "@/hooks/useCustomDiscovery";
import { useCustomerMe } from "@/hooks/useCustomer";
import { CustomerState } from "@/components/customer/CustomerUi";
import { DiscoveryCard } from "./SmartDiscovery";
import { useDiscoveryLocation } from "@/hooks/useDiscoveryLocation";
import { discoveryAreaLabel } from "@/lib/discovery-location.mjs";
import { DiscoveryLocationControl } from "./DiscoveryLocationControl";
import type { CustomerProfile } from "@/lib/customer-types";
export function TopRatedProviders() {
  const location = useDiscoveryLocation(),
    area = location.area;
  const query = useTopRatedProviders(
      { ...(area || {}), scope: "local" },
      location.ready && Boolean(area),
    ),
    profile = useCustomerMe();
  const addresses =
    (profile.data as CustomerProfile | undefined)?.customer.addresses || [];
  return (
    <section className="public-container public-section border-t border-border">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="public-eyebrow">
            <MapPin className="size-4" />
            LOCAL KNOW-HOW, BACKED BY REVIEWS
          </p>
          <h2 className="public-section-title mt-3">
            {!location.ready
              ? "Restoring your discovery area…"
              : area
                ? `Top-rated providers in ${discoveryAreaLabel(area)}`
                : "Find a well-reviewed team nearby."}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Choose your discovery area to see eligible providers with at least
            five published job reviews and a 4+ average. Recommendations
            consider review count as well as rating.
          </p>
        </div>
        <div className="flex w-full max-w-md flex-wrap gap-3">
          <DiscoveryLocationControl />
          {addresses.length > 0 && (
            <>
              <label htmlFor="top-saved-city" className="sr-only">
                Use a saved address area for discovery
              </label>
              <select
                id="top-saved-city"
                defaultValue=""
                className="customer-select"
                onChange={(event) => {
                  if (event.target.value)
                    location.choose(addresses[Number(event.target.value)]);
                }}
              >
                <option value="">Use a saved address area for discovery</option>
                {addresses.map((address, index) => (
                  <option key={index} value={String(index)}>
                    {address.label || `Address ${index + 1}`} · {address.city} ·{" "}
                    {address.pincode}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
      {!location.ready ? (
        <p role="status" className="text-sm text-muted-foreground">
          Restoring your selection. You can keep exploring the page.
        </p>
      ) : !area ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-sm leading-7 text-muted-foreground">
          Set a discovery area to find reviewed local teams. You can choose it
          manually without device location permission.
        </div>
      ) : (
        <CustomerState
          loading={query.isLoading}
          error={query.isError}
          retry={() => query.refetch()}
          empty={!query.data?.providers.length && !query.isError}
          message={`There are no qualifying reviewed providers in ${discoveryAreaLabel(area)} yet. You can still explore eligible services in your area.`}
          emptyFooter={
            <Link className="public-text-link mt-4" href="/services">
              Explore all eligible providers
              <ArrowRight className="size-4" />
            </Link>
          }
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {query.data?.providers.map((offering) => (
              <DiscoveryCard
                key={offering.provider.id}
                offering={offering}
                action={
                  <Link
                    className="public-button public-button-outline"
                    href={`/services?${new URLSearchParams({ providerId: offering.provider.id })}`}
                  >
                    View services
                    <ArrowRight className="size-4" />
                  </Link>
                }
              />
            ))}
          </div>
        </CustomerState>
      )}
    </section>
  );
}
