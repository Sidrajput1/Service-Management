"use client";
import { useRef, useState } from "react";
import { LocateFixed, MapPin, ArrowRight, X } from "lucide-react";
import {
  useDiscoveryLocation,
  type DiscoveryArea,
} from "@/hooks/useDiscoveryLocation";
import {
  discoveryArea,
  discoveryAreaLabel,
} from "@/lib/discovery-location.mjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LocationState = ReturnType<typeof useDiscoveryLocation>;
function LocationEditor({
  location,
  locate,
  close,
}: {
  location: LocationState;
  locate: () => Promise<void>;
  close: () => void;
}) {
  const [draft, setDraft] = useState<DiscoveryArea>(
    location.area || { city: "", state: "", locality: "", pincode: "" },
  );
  const [validation, setValidation] = useState("");
  const manualCity = useRef<HTMLInputElement>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const area = discoveryArea(draft);
        if (!area || !location.choose(area)) {
          setValidation("Enter a city, locality or valid six-digit PIN code.");
          return;
        }
        close();
      }}
    >
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full"
        disabled={location.pending}
        onClick={locate}
      >
        <LocateFixed className="size-4" />
        {location.pending ? "Finding your area…" : "Use my current location"}
      </Button>
      <p className="text-xs leading-6 text-muted-foreground">
        Only this action asks your browser for location. We use Google Maps to
        resolve an area when needed; your exact position is not saved as a
        discovery preference.
      </p>
      <Button
        type="button"
        variant="ghost"
        className="h-10 px-0"
        onClick={() => {
          location.cancelCapture();
          manualCity.current?.focus();
        }}
      >
        Enter location manually
      </Button>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["city", "City"],
            ["state", "State"],
            ["locality", "Locality / area"],
            ["pincode", "PIN code"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label
              htmlFor={`discovery-location-${key}`}
              className="provider-label"
            >
              {label}
            </label>
            <Input
              id={`discovery-location-${key}`}
              ref={key === "city" ? manualCity : undefined}
              className="h-11"
              value={draft[key]}
              disabled={location.pending}
              maxLength={key === "pincode" ? 6 : key === "locality" ? 100 : 80}
              pattern={key === "pincode" ? "[1-9][0-9]{5}" : undefined}
              inputMode={key === "pincode" ? "numeric" : "text"}
              onChange={(event) => {
                setValidation("");
                setDraft({ ...draft, [key]: event.target.value });
              }}
            />
          </div>
        ))}
      </div>
      {location.source === "current" && location.area && (
        <p className="text-xs text-muted-foreground">
          Selected area · Google Maps
        </p>
      )}
      {(validation || location.error) && (
        <div
          role="status"
          className="rounded-xl bg-muted p-3 text-sm leading-6"
        >
          <p>{validation || location.error}</p>
          {location.permissionDenied && (
            <details className="mt-2 text-xs leading-6">
              <summary className="cursor-pointer font-medium">
                How to enable location
              </summary>
              <p>
                Open this site’s permissions in your browser’s address bar or
                settings and allow Location, then choose “Use my current
                location” again. Servizato cannot change your browser
                permission. Manual entry always works.
              </p>
            </details>
          )}
        </div>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        This chooses where you browse. Your saved addresses and confirmed
        booking destinations stay as you set them.
      </p>
      {location.storageAvailable === false && (
        <p role="status" className="text-xs leading-6 text-muted-foreground">
          Your browser is blocking location preference storage. Your choice
          works for this visit; you may need to select it again after a refresh.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="h-11" disabled={location.pending}>
          Save discovery area
          <ArrowRight className="size-4" />
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={close}>
          {location.area
            ? "Keep current area"
            : "Continue browsing without location"}
        </Button>
      </div>
    </form>
  );
}
export function DiscoveryLocationControl({
  invite = false,
}: {
  invite?: boolean;
}) {
  const location = useDiscoveryLocation();
  const [open, setOpen] = useState(false);
  const label = location.ready
    ? discoveryAreaLabel(location.area)
    : "Restoring your area…";
  function close() {
    location.cancelCapture();
    location.dismiss();
    setOpen(false);
  }
  async function locate() {
    setOpen(true);
    const area = await location.captureCurrent();
    if (area) setOpen(false);
  }
  const control = (
    <div
      className="flex min-w-0 items-center gap-2"
      aria-busy={!location.ready || location.pending}
    >
      <Button
        variant="ghost"
        className="h-11 min-w-0 max-w-60 justify-start px-2 text-xs"
        disabled={!location.ready}
        onClick={() => setOpen(true)}
        aria-label={`Change location: ${label}`}
      >
        <MapPin className="size-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </Button>
      {location.source === "current" && location.area && (
        <span
          translate="no"
          className="shrink-0 whitespace-nowrap text-xs not-italic text-muted-foreground"
        >
          Google Maps
        </span>
      )}
      {location.area && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Clear discovery area"
          onClick={location.clear}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
  return (
    <>
      <div className={invite ? "border-t border-border/60" : ""}>
        {invite ? (
          <div className="public-container flex flex-wrap items-center justify-between gap-x-3">
            {control}
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Browse an area. Confirm your service address when booking.
            </p>
          </div>
        ) : (
          control
        )}
        {invite && location.ready && !location.area && !location.dismissed && (
          <div className="border-t border-border bg-secondary/55">
            <div className="public-container flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="text-xs font-semibold leading-6">
                Set your location for better service recommendations
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" disabled={location.pending} onClick={locate}>
                  Use my current location
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(true)}
                >
                  Enter location manually
                </Button>
                <Button variant="ghost" size="sm" onClick={location.dismiss}>
                  Continue browsing without location
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {location.ready &&
        location.area &&
        location.storageAvailable === false &&
        invite && (
          <p
            role="status"
            className="public-container pb-2 text-xs text-muted-foreground"
          >
            Area remembered for this visit. Browser storage is unavailable.
          </p>
        )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (value) setOpen(true);
          else close();
        }}
      >
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set your discovery location</DialogTitle>
            <DialogDescription>
              Choose an area for service recommendations. We remember your
              choice on this browser.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <LocationEditor
              key={`${location.scope}:${JSON.stringify(location.area)}`}
              location={location}
              locate={locate}
              close={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
