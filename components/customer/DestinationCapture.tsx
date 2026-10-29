"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  createAddressLookup,
  getCurrentLocation,
  type CurrentLocationReading,
} from "@/lib/current-location.mjs";
import type { Address } from "@/lib/customer-types";
export interface DestinationCaptureValue extends CurrentLocationReading {
  confirmed: true;
}
export function DestinationCapture({
  value,
  onChange,
  onSuggestedAddress,
  lookupAddress,
  onPendingChange,
}: {
  value?: DestinationCaptureValue;
  onChange: (value: DestinationCaptureValue | undefined) => void;
  onSuggestedAddress: (suggestion: Address) => void;
  lookupAddress?: ReturnType<typeof createAddressLookup>;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [ownLookup] = useState(() => createAddressLookup());
  const [position, setPosition] = useState<CurrentLocationReading>();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [attribution, setAttribution] = useState(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  async function capture() {
    const attempt = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setPending(true);
    onPendingChange?.(true);
    setMessage("");
    setPosition(undefined);
    setAttribution(false);
    onChange(undefined);
    try {
      const reading = await getCurrentLocation();
      if (generation.current !== attempt) return;
      if (reading.accuracy > 50) {
        setMessage(
          "GPS accuracy is worse than 50 metres. Retry in a clearer area or enter the address manually.",
        );
        return;
      }
      setPosition(reading);
      const timeout = setTimeout(() => abort.abort(), 10000);
      try {
        const suggestion = await (lookupAddress || ownLookup)(
          reading,
          abort.signal,
        );
        if (generation.current !== attempt) return;
        onSuggestedAddress(suggestion);
        setAttribution(true);
        setMessage(
          "Suggested address filled below. Check every field and complete any missing details, then confirm the destination. Editing the address removes this GPS capture; recapture if needed.",
        );
      } catch {
        if (generation.current !== attempt) return;
        setMessage(
          "Address lookup is unavailable. Your entries were kept. Enter the address manually; you may confirm this GPS point only if you are at that service address.",
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      if (generation.current === attempt)
        setMessage(
          error instanceof Error
            ? error.message
            : "Location is unavailable. Enter the address manually.",
        );
    } finally {
      if (generation.current === attempt) {
        setPending(false);
        onPendingChange?.(false);
      }
    }
  }
  return (
    <fieldset className="rounded-xl border border-border bg-secondary/30 p-4">
      <legend className="px-1 text-sm font-semibold">
        Service destination
      </legend>
      <p className="text-xs leading-6 text-muted-foreground">
        Use this only when you are at the service address. With your permission,
        we use GPS and Google Maps to suggest editable address details. Your
        browsing location is separate.
      </p>
      <Button
        type="button"
        className="mt-3 h-11"
        variant="outline"
        disabled={pending}
        onClick={capture}
      >
        {pending ? "Finding your address…" : "Use my current location"}
      </Button>
      {attribution && (
        <p className="mt-2 text-xs text-muted-foreground">
          Address suggestion by Google Maps
        </p>
      )}
      {position && !pending && (
        <label className="mt-4 flex items-start gap-3 text-xs leading-6">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-primary"
            checked={Boolean(value)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? { ...position, confirmed: true }
                  : undefined,
              )
            }
          />
          I am at the service address entered below and confirm this captured
          point for my assigned Pro’s navigation and optional arrival detection.
        </label>
      )}
      {(position || value) && (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-11"
          onClick={() => {
            generation.current++;
            controller.current?.abort();
            setPending(false);
            onPendingChange?.(false);
            setPosition(undefined);
            onChange(undefined);
            setMessage(
              "GPS point removed. You can continue with the address alone.",
            );
          }}
        >
          Remove captured location
        </Button>
      )}
      {message && (
        <p
          role="status"
          className="mt-3 text-xs leading-6 text-muted-foreground"
        >
          {message}
        </p>
      )}
      {!position && (
        <p className="mt-2 text-xs text-muted-foreground">
          No GPS destination attached. Manual address entry is available.
        </p>
      )}
    </fieldset>
  );
}
