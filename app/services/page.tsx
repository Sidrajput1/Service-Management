import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SmartDiscovery } from "@/components/public/SmartDiscovery";
export const metadata: Metadata = {
  title: "Find services & local providers | Servizato",
  description:
    "Search eligible home-service providers by service, business name, city, locality or PIN code.",
};
export default function Page() {
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main
        id="main-content"
        className="public-container public-section min-h-[65vh]"
      >
        <p className="public-eyebrow">FIND YOUR HELPING HAND</p>
        <h1 className="public-section-title mt-3">
          Good help, closer to home.
        </h1>
        <p className="mb-8 mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          A service, a familiar business, or a place to start. Find teams that
          serve your area and compare what they offer.
        </p>
        <Suspense fallback={<p role="status">Loading service search…</p>}>
          <SmartDiscovery />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
