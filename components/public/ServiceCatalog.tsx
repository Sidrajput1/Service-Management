"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AirVent, ArrowUpRight, Droplets, Hammer, Lightbulb, PaintRoller, Search, SearchX, Sparkles, Wrench, RefreshCw } from "lucide-react";
import { BookingButton } from "@/components/public/BookingButton";
import { Button } from "@/components/ui/button";
import { bookingDestination } from "@/lib/booking-redirect";
import type { PublicCatalog } from "@/lib/public-service-types";

function serviceIcon(name: string) {
  if (/\bac\b|air.?condition|cooling/i.test(name)) return AirVent;
  if (/plumb|water|tap|drain/i.test(name)) return Droplets;
  if (/electri|wiring|light/i.test(name)) return Lightbulb;
  if (/paint/i.test(name)) return PaintRoller;
  if (/clean/i.test(name)) return Sparkles;
  if (/carpen|furniture|wood/i.test(name)) return Hammer;
  return Wrench;
}

export function ServiceCatalog({ catalog, featured = false, query = "" }: { catalog: PublicCatalog; featured?: boolean; query?: string }) {
  const [search, setSearch] = useState(query);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const filtered = catalog.services.filter(service => `${service.name} ${service.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  const visible = featured ? filtered.slice(0, 6) : filtered;

  return <div>
    {!featured && <form action="/services" className="mb-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      <Search className="ml-3 size-5 shrink-0 text-muted-foreground" />
      <label className="sr-only" htmlFor="catalog-search">Search available services</label>
      <input id="catalog-search" name="q" type="search" maxLength={120} value={search} onChange={event => setSearch(event.target.value)} placeholder="What can we help you with?" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <button className="public-button public-button-primary" type="submit">Search</button>
    </form>}
    {catalog.status === "error" ? <div className="public-catalog-state" role="status">
      <RefreshCw className="size-8 text-primary" /><h3 className="text-xl font-semibold">Let’s try that again</h3>
      <p>We couldn’t load the service catalog. Please try again in a moment.</p>
      <Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="h-11 rounded-xl px-5"><RefreshCw className={pending ? "animate-spin" : ""} />{pending ? "Loading services…" : "Retry services"}</Button>
    </div> : !visible.length ? <div className="public-catalog-state" role="status">
      <SearchX className="size-9 text-brand-teal-dark" /><h3 className="text-xl font-semibold">{search ? "No matching services" : "More helping hands are on the way"}</h3>
      <p>{search ? "Try a different service name or clear your search to see all available services." : "There are no active provider offerings to book right now. Please check back soon."}</p>
      {search && <Button variant="outline" className="h-11 px-5" onClick={() => { setSearch(""); router.replace("/services", { scroll: false }); }}>Clear search</Button>}
      {!search && <Link href="/signup?role=provider" className="public-text-link">Offer your services <ArrowUpRight className="size-4" /></Link>}
    </div> : <>
      {!featured && <p className="mb-5 text-sm text-muted-foreground" role="status">{filtered.length} {filtered.length === 1 ? "service" : "services"} to explore</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((service, i) => {
          const Icon = serviceIcon(service.name);
          return <article key={service.id} className="public-service-card group overflow-hidden rounded-2xl border border-border bg-card">
            <div className={`public-service-art ${i % 2 ? "public-service-art-teal" : "public-service-art-coral"}`} aria-hidden="true">
              <div className="public-service-art-grid" /><span className="public-service-icon"><Icon strokeWidth={1.25} /></span>
              <span className="absolute bottom-4 right-5 text-[10px] font-bold tracking-[0.18em] opacity-60">SERVIZATO / SERVICES</span>
            </div>
            <div className="p-6">
              <h3 className="font-display text-lg font-semibold tracking-tight"><Link href={`/services/${service.id}`} className="hover:text-primary">{service.name}</Link></h3>
              <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">{service.description || "Explore provider details, check your service area, and request a time that suits you."}</p>
              <Link href={`/services/${service.id}`} className="public-text-link mt-2">View service details <ArrowUpRight className="size-3.5" /></Link>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-5">
                <div><p className="text-xs text-muted-foreground">From</p><p className="mt-0.5 text-xl font-bold">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(service.price)}</p><p className="mt-1 text-[11px] text-muted-foreground">{service.taxPercent ? `+ ${service.taxPercent}% tax` : "No additional tax"}</p></div>
                <BookingButton destination={bookingDestination(service.id, service.offeringId)} serviceName={service.name} className="min-h-11 px-4 text-xs" />
              </div>
            </div>
          </article>;
        })}
      </div>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">Starting prices reflect listed provider offerings. Service area, provider availability, and the final invoice are confirmed through your booking.</p>
    </>}
  </div>;
}

export function CatalogSkeleton() {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading available services">{[0, 1, 2].map(i => <div key={i} className="h-80 animate-pulse rounded-2xl border border-border bg-muted" />)}<span className="sr-only">Loading services…</span></div>;
}
