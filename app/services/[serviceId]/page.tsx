import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, MapPin, Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingButton } from "@/components/public/BookingButton";
import { ServiceCatalog } from "@/components/public/ServiceCatalog";
import { getPublicServices } from "@/lib/public-services";
import { bookingDestination } from "@/lib/booking-redirect";
import { money } from "@/lib/customer-types";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Service details & provider offerings | Servizato",
  description:
    "Explore a local service, compare listed provider offerings, and request a booking with Servizato.",
};
export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  if (!/^[a-f\d]{24}$/i.test(serviceId)) notFound();
  const catalog = await getPublicServices(serviceId);
  const service = catalog.services[0];
  if (catalog.status === "ready" && !service) notFound();
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main-content" className="public-container public-section">
        <Link
          href="/services"
          className="mb-7 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          All services
        </Link>
        {catalog.status === "error" ? (
          <>
            <h1 className="public-section-title mb-7">Service details</h1>
            <ServiceCatalog catalog={catalog} />
          </>
        ) : (
          <>
            <div className="mb-10 grid items-center gap-8 rounded-3xl border border-border bg-secondary/35 p-7 sm:p-10 lg:grid-cols-[1fr_.4fr]">
              <div>
                <p className="public-eyebrow">
                  A HELPING HAND FOR YOUR EVERYDAY
                </p>
                <h1 className="public-section-title mt-3">{service.name}</h1>
                <p className="mt-4 max-w-150 text-sm leading-8 text-muted-foreground">
                  {service.description ||
                    "Explore current provider offerings for this service. Your provider confirms the service area and preferred time through the booking request."}
                </p>
                <div className="mt-6 flex flex-wrap gap-5 text-xs text-secondary-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5" />
                    Browse without an account
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5" />
                    Prices set by providers
                  </span>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="mx-auto hidden size-36 -rotate-6 items-center justify-center rounded-3xl border border-brand-teal/20 bg-card shadow-lg shadow-brand-teal/5 sm:flex"
              >
                <Wrench
                  className="size-18 text-brand-teal-dark"
                  strokeWidth={1}
                />
              </div>
            </div>
            <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight">
              Choose your service provider
            </h2>
            <p className="mb-7 text-sm leading-7 text-muted-foreground">
              These are active listings. Check your address and preferred time
              in the booking flow; requests require provider acceptance.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              {service.offerings
                ?.sort((a, b) => a.price - b.price)
                .map((offering) => (
                  <article className="customer-panel" key={offering.id}>
                    <p className="public-eyebrow">PROVIDER OFFERING</p>
                    <h3 className="mt-3 font-display text-lg font-semibold">
                      {offering.name}
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      {offering.providerName}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {offering.description ||
                        "Discuss the service details with your provider through your booking."}
                    </p>
                    {offering.serviceAreas.length > 0 && (
                      <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                        <MapPin className="mt-1 size-3.5 shrink-0" />
                        {offering.serviceAreas.join(", ")}
                      </p>
                    )}
                    {offering.offerName && (
                      <p className="mt-4 text-xs font-bold text-primary">
                        {offering.offerName}
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
                      <div>
                        <p className="text-xl font-bold">
                          {offering.pricingModel === "starting" ? "From " : ""}
                          {money(offering.price)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          / {offering.unit || "job"}{" "}
                          {offering.taxPercent
                            ? `+ ${offering.taxPercent}% tax`
                            : "· No additional tax"}
                        </p>
                      </div>
                      <BookingButton
                        destination={bookingDestination(
                          service.id,
                          offering.id,
                        )}
                        serviceName={offering.name}
                      />
                    </div>
                  </article>
                ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
