"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Building2, MapPin, Star, ArrowRight, X } from "lucide-react";
import {
  useCustomerServices,
  useCustomerProviders,
  discoveryParams,
} from "@/hooks/useCustomDiscovery";
import { useCustomerMe } from "@/hooks/useCustomer";
import { CustomerState } from "@/components/customer/CustomerUi";
import { BookingRequestForm } from "@/components/customer/BookingRequestForm";
import { BookingButton } from "./BookingButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bookingDestination } from "@/lib/booking-redirect";
import { money, type CustomerProfile } from "@/lib/customer-types";
import {
  useDiscoveryLocation,
  type DiscoveryArea,
} from "@/hooks/useDiscoveryLocation";
import {
  areaFromFilters,
  discoveryAreaLabel,
} from "@/lib/discovery-location.mjs";
import {
  discoveryAreaIdentity,
  discoveryQueryIdentity,
  initialDiscoverySearchState,
  reconcileDiscoverySearch,
  repairDiscoverySearch,
  stageDiscoverySearch,
} from "@/lib/discovery-query.mjs";
import { DiscoveryLocationControl } from "./DiscoveryLocationControl";
import type {
  DiscoveryFilters,
  DiscoveryOffering,
  MarketplaceCatalog,
} from "@/lib/marketplace-types";

function SearchForm({
  initial,
  catalog,
  submit,
  reset,
  addresses,
}: {
  initial: DiscoveryFilters;
  catalog?: MarketplaceCatalog;
  submit: (filters: DiscoveryFilters) => void;
  reset: () => void;
  addresses: CustomerProfile["customer"]["addresses"];
}) {
  const [draft, setDraft] = useState<DiscoveryFilters>(initial);
  return (
    <form
      className="provider-panel mb-7 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(draft);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["q", "Service name", "What do you need help with?"],
            ["provider", "Business name (optional)", "Search a provider"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <div key={key}>
            <label htmlFor={`search-${key}`} className="provider-label">
              {label}
            </label>
            <Input
              id={`search-${key}`}
              placeholder={placeholder}
              value={draft[key] || ""}
              maxLength={100}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
              className="h-12"
            />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["city", "City (optional)"],
            ["state", "State (optional)"],
            ["locality", "Locality (optional)"],
            ["pincode", "PIN code (optional)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`search-${key}`} className="provider-label">
              {label}
            </label>
            <Input
              id={`search-${key}`}
              value={draft[key] || ""}
              maxLength={key === "pincode" ? 6 : 80}
              pattern={key === "pincode" ? "[1-9][0-9]{5}" : undefined}
              inputMode={key === "pincode" ? "numeric" : "text"}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
              className="h-12"
            />
          </div>
        ))}
      </div>
      {addresses.length > 0 && (
        <div>
          <label htmlFor="discovery-address" className="provider-label">
            Or explicitly use a saved address area for discovery
          </label>
          <select
            id="discovery-address"
            className="customer-select max-w-lg"
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;
              const address = addresses[Number(event.target.value)];
              setDraft({
                ...draft,
                city: address.city || "",
                state: address.state || "",
                locality: address.locality || "",
                pincode: address.pincode || "",
              });
            }}
          >
            <option value="">Choose a saved address</option>
            {addresses.map((address, index) => (
              <option key={index} value={index}>
                {address.label || `Address ${index + 1}`} · {address.city} ·{" "}
                {address.pincode}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="search-category" className="provider-label">
            Category
          </label>
          <select
            id="search-category"
            value={draft.category || ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                category: event.target.value,
                serviceId: "",
              })
            }
            className="customer-select"
          >
            <option value="">All categories</option>
            {catalog?.categories.map((category) => (
              <option value={category.key} key={category.key}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="search-service" className="provider-label">
            Specific service
          </label>
          <select
            id="search-service"
            value={draft.serviceId || ""}
            onChange={(event) =>
              setDraft({ ...draft, serviceId: event.target.value })
            }
            className="customer-select"
          >
            <option value="">All matching services</option>
            {catalog?.services
              .filter(
                (service) =>
                  !draft.category ||
                  (service.categoryKey || "other") === draft.category,
              )
              .map((service) => (
                <option value={service._id} key={service._id}>
                  {service.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="search-rating" className="provider-label">
            Customer rating
          </label>
          <select
            id="search-rating"
            value={draft.minRating || "0"}
            onChange={(event) =>
              setDraft({ ...draft, minRating: event.target.value })
            }
            className="customer-select"
          >
            <option value="0">All providers</option>
            <option value="4">4 stars & above</option>
            <option value="4.5">4.5 stars & above</option>
          </select>
        </div>
        <div>
          <label htmlFor="search-sort" className="provider-label">
            Sort results
          </label>
          <select
            id="search-sort"
            value={draft.sort || "relevance"}
            onChange={(event) =>
              setDraft({ ...draft, sort: event.target.value })
            }
            className="customer-select"
          >
            <option value="relevance">Recommended</option>
            <option value="rating">Rating confidence</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-xs leading-6 text-muted-foreground">
          Any one field is enough. Combined location filters must match the same
          configured service area. Scheduling is confirmed after your request.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={reset}
          >
            <X className="size-4" />
            Reset
          </Button>
          <Button type="submit" className="public-button public-button-primary">
            <Search className="size-4" />
            Find providers
          </Button>
        </div>
      </div>
    </form>
  );
}
export function DiscoveryCard({
  offering,
  action,
}: {
  offering: DiscoveryOffering;
  action: React.ReactNode;
}) {
  return (
    <article className="provider-panel flex h-full flex-col">
      <div className="mb-5 flex items-center gap-4">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {offering.provider.businessImage?.url ? (
            <Image
              fill
              sizes="64px"
              className="object-contain"
              src={offering.provider.businessImage.url}
              alt={`${offering.provider.companyName} logo`}
            />
          ) : (
            <Building2 className="size-7 text-secondary-foreground" />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">
            {offering.provider.companyName}
          </h2>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {offering.reviewCount && offering.rating !== null ? (
              <>
                <Star className="size-3.5 text-primary" />
                {offering.rating.toFixed(1)} · {offering.reviewCount}{" "}
                verified-job reviews
              </>
            ) : (
              "No reviews yet"
            )}
          </p>
        </div>
      </div>
      <h3 className="text-sm font-bold">{offering.service.name}</h3>
      <p className="mb-4 mt-3 flex-1 text-sm leading-7 text-muted-foreground">
        {offering.service.description ||
          offering.provider.description ||
          "Review the service scope with your provider before work begins."}
      </p>
      <p className="mb-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
        <MapPin className="mt-1 size-3.5 shrink-0" />
        {offering.provider.serviceAreas.slice(0, 3).join(", ") +
          (offering.provider.serviceAreas.length > 3
            ? ` +${offering.provider.serviceAreas.length - 3} more areas`
            : "")}
      </p>
      {offering.discoveryCoverage === "outside" && (
        <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-6">
          Outside your discovery area. You can request a visit; the provider
          must confirm coverage of your service address.
        </p>
      )}
      {offering.pricing.offerActive && offering.pricing.offerName && (
        <p className="mb-3 text-xs font-semibold text-primary">
          {offering.pricing.offerName}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
        <div>
          <p className="text-lg font-bold">
            {offering.pricing.model === "quote_required"
              ? "Quote required"
              : `${offering.pricing.model === "starting" ? "From " : ""}${money(offering.pricing.finalPrice)}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {offering.pricing.model === "quote_required"
              ? "Scope and quote agreed before booking"
              : `/ ${offering.pricing.unit.replaceAll("_", " ")} + ${offering.pricing.taxPercent}% tax`}
          </p>
        </div>
        {action}
      </div>
    </article>
  );
}
export function SmartDiscovery({ customer = false }: { customer?: boolean }) {
  const params = useSearchParams(),
    router = useRouter(),
    session = useSession(),
    catalog = useCustomerServices(),
    profile = useCustomerMe();
  const {
    ready: locationReady,
    area: preferredArea,
    choose: chooseLocation,
    clear: clearLocation,
  } = useDiscoveryLocation();
  const urlFilters = useMemo(
    () => Object.fromEntries(params.entries()) as DiscoveryFilters,
    [params],
  );
  const [searchSnapshot, setSearchSnapshot] = useState<{
    search: typeof initialDiscoverySearchState;
    effect: {
      chooseArea: Partial<DiscoveryArea> | null;
      replaceSearch: string | null;
      expectedSearch: string;
    } | null;
  }>({ search: initialDiscoverySearchState, effect: null });
  const searchState = searchSnapshot.search;
  const reconciliation = useMemo(
    () =>
      reconcileDiscoverySearch(
        searchState,
        urlFilters,
        preferredArea,
        locationReady,
      ),
    [searchState, urlFilters, preferredArea, locationReady],
  );
  const filters: DiscoveryFilters = reconciliation.state.filters;
  const discoveryLocation = areaFromFilters(filters);
  const base = customer ? "/customer/services" : "/services";
  if (reconciliation.state !== searchState) {
    setSearchSnapshot({
      search: reconciliation.state,
      effect:
        reconciliation.chooseArea || reconciliation.replaceSearch !== null
          ? {
              chooseArea: reconciliation.chooseArea,
              replaceSearch: reconciliation.replaceSearch,
              expectedSearch: params.toString(),
            }
          : searchSnapshot.effect,
    });
  }
  const appliedTransition = useRef<typeof searchSnapshot.effect>(null);
  useEffect(() => {
    const effect = searchSnapshot.effect;
    if (!locationReady || !effect || appliedTransition.current === effect)
      return;
    appliedTransition.current = effect;
    if (effect.chooseArea) chooseLocation(effect.chooseArea);
    if (effect.replaceSearch !== null)
      repairDiscoverySearch(
        window,
        base,
        effect.expectedSearch,
        effect.replaceSearch,
      );
  }, [base, chooseLocation, locationReady, searchSnapshot.effect]);
  const searchReady = locationReady && reconciliation.state === searchState;
  const query = useCustomerProviders(
    { ...filters, public: !customer },
    searchReady,
  );
  const [selected, setSelected] = useState<DiscoveryOffering | null>(null);
  const navigate = (values: DiscoveryFilters) => {
    setSearchSnapshot({
      search: stageDiscoverySearch(searchState, values),
      effect: null,
    });
    const search = discoveryParams(values).toString();
    router.push(`${base}${search ? `?${search}` : ""}`, { scroll: false });
  };
  const apply = (values: DiscoveryFilters) => {
    const area = areaFromFilters(values);
    const changedArea =
      discoveryAreaIdentity(area) !== discoveryAreaIdentity(preferredArea);
    // Search/filter/scope actions never recapture GPS or rewrite an unchanged preference.
    if (changedArea) {
      if (area) chooseLocation(area);
      else clearLocation();
    }
    navigate({
      ...values,
      page: "1",
      ...(changedArea ? { scope: "local" } : {}),
    });
  };
  const page = Number(filters.page || 1),
    results = query.data?.providers || [];
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-2">
        <div>
          <p className="text-xs font-semibold">
            Discovery area ·{" "}
            {locationReady
              ? discoveryAreaLabel(discoveryLocation)
              : "Restoring your selection…"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Your service address is chosen separately when you request a visit.
          </p>
        </div>
        <DiscoveryLocationControl />
      </div>
      <SearchForm
        key={discoveryQueryIdentity(filters)}
        initial={filters}
        catalog={catalog.data}
        submit={apply}
        reset={() =>
          navigate({ ...(discoveryLocation || {}), page: "1", scope: "local" })
        }
        addresses={
          (profile.data as CustomerProfile | undefined)?.customer.addresses ||
          []
        }
      />
      <CustomerState
        loading={!searchReady || query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
        empty={!results.length && !query.isError}
        message={
          discoveryLocation && filters.scope !== "other"
            ? `No eligible offerings match ${discoveryAreaLabel(discoveryLocation)} and these filters. Change your area or explicitly explore other providers who may accept a visit outside their configured coverage.`
            : "No eligible offerings match these filters. Try another service, provider name or area."
        }
        emptyFooter={
          discoveryLocation && filters.scope !== "other" ? (
            <Button
              className="mt-5 h-11"
              variant="outline"
              onClick={() => apply({ ...filters, scope: "other" })}
            >
              Explore other eligible providers
              <ArrowRight className="size-4" />
            </Button>
          ) : page > 1 ? (
            <Button
              className="mt-5 h-11"
              variant="outline"
              onClick={() => navigate({ ...filters, page: String(page - 1) })}
            >
              Previous results
            </Button>
          ) : undefined
        }
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            {filters.scope === "other"
              ? "Providers outside your discovery area · confirmation required"
              : discoveryLocation
                ? "Providers serving your discovery area"
                : "Eligible provider offerings"}{" "}
            · page {page}
          </p>
          <p>No appointment time is guaranteed by these results.</p>
        </div>
        {discoveryLocation && (
          <Button
            variant="outline"
            className="mb-5 h-11"
            onClick={() =>
              apply({
                ...filters,
                scope: filters.scope === "other" ? "local" : "other",
              })
            }
          >
            {filters.scope === "other"
              ? "Return to providers serving this area"
              : "Explore providers outside this area"}
          </Button>
        )}
        {filters.providerId && (
          <Link href="/services" className="public-text-link mb-4">
            Explore other providers
          </Link>
        )}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((offering) => {
            const destination = bookingDestination(
              offering.service.id,
              offering.offeringId,
            );
            return (
              <DiscoveryCard
                key={offering.offeringId}
                offering={offering}
                action={
                  offering.pricing.model === "quote_required" ? (
                    <p className="max-w-44 text-xs leading-5 text-muted-foreground">
                      Online booking is not enabled for quotation-based work.
                    </p>
                  ) : session.data?.user.role === "customer" ? (
                    <Button
                      className="public-button public-button-primary"
                      onClick={() => setSelected(offering)}
                    >
                      {params.get("offeringId") === offering.offeringId
                        ? "Continue booking"
                        : "Request service"}
                      <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <BookingButton
                      destination={destination}
                      serviceName={offering.service.name}
                      label="Request service"
                    />
                  )
                }
              />
            );
          })}
        </div>
      </CustomerState>
      {(page > 1 || query.data?.hasMore) && (
        <nav
          aria-label="Search result pages"
          className="mt-7 flex justify-between gap-4"
        >
          <Button
            variant="outline"
            className="h-11 px-5"
            disabled={page <= 1}
            onClick={() => {
              navigate({
                ...filters,
                page: String(page - 1),
              });
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="h-11 px-5"
            disabled={!query.data?.hasMore}
            onClick={() => {
              navigate({
                ...filters,
                page: String(page + 1),
              });
            }}
          >
            Next
          </Button>
        </nav>
      )}
      {selected && (
        <BookingRequestForm
          offering={selected}
          repeatBookingId={params.get("repeatBookingId") || undefined}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
