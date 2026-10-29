"use client";
import { useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { googleMapsLink, googleMapsEmbed } from "@/lib/map-links.mjs";
import { formatServiceAddress } from "@/lib/service-location-client.mjs";
import type { Address } from "@/lib/customer-types";
export function ServiceAddressPreview({
  address,
  navigate = false,
}: {
  address?: Address;
  navigate?: boolean;
}) {
  const [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false);
  const link = googleMapsLink(address, navigate),
    embed = googleMapsEmbed(
      address,
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
    );
  return (
    <section className="customer-panel" aria-label="Confirmed service address">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <MapPin className="size-4 text-primary" />
        Confirmed service address
      </h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
        {formatServiceAddress(address) ||
          "A usable service address has not been supplied. Contact your service team before travelling."}
      </p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="public-button public-button-outline mt-4 w-full"
        >
          {navigate ? (
            <Navigation className="size-4" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          {navigate ? "Navigate to Customer" : "Open in Google Maps"}
        </a>
      )}
      {embed && !failed && !loaded && (
        <div className="mt-4">
          <p className="mb-3 text-xs leading-6 text-muted-foreground">
            Loading the map shares this service destination with Google.
            Navigation opens separately and keeps Servizato available.
          </p>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setLoaded(true)}
          >
            Load address map
          </Button>
        </div>
      )}
      {loaded && embed && !failed && (
        <div className="mt-5">
          <iframe
            title="Map of the confirmed service address"
            src={embed}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-72 w-full rounded-xl border border-border bg-muted"
            onError={() => setFailed(true)}
          />
          <Button
            variant="ghost"
            className="mt-2 h-11"
            onClick={() => {
              setFailed(true);
              setLoaded(false);
            }}
          >
            Map not displaying? Use the address and link
          </Button>
        </div>
      )}
      {link && (!embed || failed) && (
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {failed
            ? "The map preview is unavailable. Use the saved address or Google Maps link above."
            : "Use the Google Maps link for the saved destination. The embedded preview is not configured."}
        </p>
      )}
      {address?.locationConfirmed && (
        <p className="mt-3 text-xs text-muted-foreground">
          Coordinates were confirmed by the customer for this booking.
        </p>
      )}
    </section>
  );
}
