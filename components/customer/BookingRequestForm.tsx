"use client";
import {
  DestinationCapture,
  type DestinationCaptureValue,
} from "./DestinationCapture";
import { isAxiosError } from "axios";
import { useRef, useState } from "react";
import {
  createAddressLookup,
  mergeSuggestedAddress,
} from "@/lib/current-location.mjs";
import { assessCoverage } from "@/lib/marketplace-policy.mjs";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useCreateServiceRequest } from "@/hooks/useCustomDiscovery";
import { useCustomerMe } from "@/hooks/useCustomer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  money,
  type Address,
  type CustomerProfile,
} from "@/lib/customer-types";
import type { DiscoveryOffering } from "@/lib/marketplace-types";
export function BookingRequestForm({
  offering,
  close,
  repeatBookingId,
}: {
  offering: DiscoveryOffering;
  close: () => void;
  repeatBookingId?: string;
}) {
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [capturePending, setCapturePending] = useState(false);
  const [lookupAddress] = useState(() => createAddressLookup());
  const [captureRevision, setCaptureRevision] = useState(0);
  const requestKey = useRef<string | null>(null);
  const [destinationCapture, setDestinationCapture] =
    useState<DestinationCaptureValue>();
  const mutation = useCreateServiceRequest(),
    profile = useCustomerMe();
  const addresses =
    (profile.data as CustomerProfile | undefined)?.customer.addresses || [];
  const [address, setAddress] = useState<Address>({
      addressLine: "",
      city: "",
      locality: "",
      pincode: "",
      state: "",
    }),
    [quantity, setQuantity] = useState(1),
    [error, setError] = useState(""),
    [success, setSuccess] = useState<{ id: string } | null>(null);
  const coverage = assessCoverage(
    offering.provider.coverageAreas || [],
    address,
  );
  function invalidateAddress() {
    setAddressConfirmed(false);
    setCapturePending(false);
    setDestinationCapture(undefined);
    setCaptureRevision((value) => value + 1);
    requestKey.current = null;
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close();
      }}
    >
      <DialogContent className="w-[calc(100%_-_2rem)]! max-w-150! max-h-[92dvh] overflow-y-auto rounded-2xl p-6 sm:p-8">
        <DialogTitle>
          {success ? "Your request is sent" : "A little help, on your terms"}
        </DialogTitle>
        <DialogDescription>
          {success
            ? "Your provider reviews the request before it becomes a booking."
            : `${offering.service.name} · ${offering.provider.companyName}`}
        </DialogDescription>
        {success ? (
          <div className="space-y-5">
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Check className="size-7" />
            </span>
            <p className="text-sm">Status: Awaiting provider</p>
            <p className="break-all text-xs text-muted-foreground">
              Request reference: {success.id}
            </p>
            <Link
              href="/customer/bookings?view=requests"
              className="public-button public-button-primary w-full"
              onClick={close}
            >
              View my requests
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <form
            className="space-y-5"
            onChange={() => {
              requestKey.current = null;
            }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (mutation.isPending || capturePending) return;
              if (!addressConfirmed) {
                setError(
                  "Confirm the actual service address before sending your request.",
                );
                return;
              }
              const fields = new FormData(event.currentTarget);
              setError("");
              try {
                const result = await mutation.mutateAsync({
                  requestKey: (requestKey.current ||= crypto.randomUUID()),
                  destinationConfirmed: true,
                  serviceOfferingId: offering.offeringId,
                  ...(repeatBookingId ? { repeatOfBookingId: repeatBookingId } : {}),
                  destinationCapture,
                  quantity,
                  address: {
                    addressLine: address.addressLine?.trim() || "",
                    city: address.city?.trim() || "",
                    locality: address.locality?.trim(),
                    state: address.state?.trim(),
                    pincode: address.pincode || "",
                  },
                  preferredDate: fields.get("preferredDate")
                    ? new Date(
                        String(fields.get("preferredDate")),
                      ).toISOString()
                    : undefined,
                  description: String(fields.get("description") || ""),
                });
                if (!result?.success || !result.serviceRequest?.id)
                  throw new Error("Unconfirmed request");
                setSuccess(result.serviceRequest);
              } catch (failure) {
                setError(
                  isAxiosError(failure) &&
                    typeof failure.response?.data?.error === "string"
                    ? failure.response.data.error
                    : "We could not confirm this request. Check the service area, address and preferred time, then retry. The offering or its coverage may have changed.",
                );
              }
            }}
          >
            <fieldset
              disabled={mutation.isPending}
              className="min-w-0 space-y-5"
            >
              <div className="rounded-xl bg-secondary/60 p-4 text-sm">
                <p className="font-semibold">
                  {offering.pricing.model === "starting"
                    ? "Starting estimate"
                    : "Listed service price"}
                  :{" "}
                  {money(
                    offering.pricing.finalPrice *
                      (offering.pricing.model === "per_unit" ? quantity : 1),
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  + {offering.pricing.taxPercent}% tax ·{" "}
                  {offering.pricing.unit.replaceAll("_", " ")}
                  {offering.pricing.model === "starting"
                    ? ". Final scope and additional work must be agreed with your provider."
                    : ""}
                </p>
              </div>
              {offering.pricing.model === "per_unit" && (
                <div>
                  <label className="provider-label" htmlFor="booking-quantity">
                    Quantity ({offering.pricing.unit.replaceAll("_", " ")})
                  </label>
                  <Input
                    id="booking-quantity"
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(Number(event.target.value))
                    }
                    required
                    className="h-12"
                  />
                </div>
              )}
              {addresses.length > 0 && (
                <div>
                  <label htmlFor="saved-address" className="provider-label">
                    Use a saved address
                  </label>
                  <select
                    id="saved-address"
                    className="customer-select"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value !== "") {
                        invalidateAddress();
                        setAddress(addresses[Number(event.target.value)]);
                      }
                    }}
                  >
                    <option value="">Choose an address</option>
                    {addresses.map((saved, index) => (
                      <option key={index} value={index}>
                        {saved.label || `Address ${index + 1}`} · {saved.city} ·{" "}
                        {saved.pincode}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <DestinationCapture
                key={captureRevision}
                value={destinationCapture}
                lookupAddress={lookupAddress}
                onPendingChange={(pending) => {
                  setCapturePending(pending);
                  if (pending) {
                    setAddressConfirmed(false);
                    requestKey.current = null;
                  }
                }}
                onChange={setDestinationCapture}
                onSuggestedAddress={(suggestion) => {
                  setAddress((current) =>
                    mergeSuggestedAddress({ ...current }, suggestion),
                  );
                  setAddressConfirmed(false);
                  requestKey.current = null;
                }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["addressLine", "House / building, street & landmark"],
                    ["city", "City"],
                    ["locality", "Locality / area"],
                    ["state", "State (optional)"],
                    ["pincode", "PIN code"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className={key === "addressLine" ? "sm:col-span-2" : ""}
                  >
                    <label
                      htmlFor={`booking-${key}`}
                      className="provider-label"
                    >
                      {label}
                    </label>
                    <Input
                      id={`booking-${key}`}
                      value={address[key] || ""}
                      onChange={(event) => {
                        invalidateAddress();
                        setAddress({ ...address, [key]: event.target.value });
                      }}
                      required={["addressLine", "city", "pincode"].includes(
                        key,
                      )}
                      maxLength={
                        key === "pincode"
                          ? 6
                          : key === "addressLine"
                            ? 300
                            : 100
                      }
                      pattern={key === "pincode" ? "[1-9][0-9]{5}" : undefined}
                      inputMode={key === "pincode" ? "numeric" : "text"}
                      className="h-12"
                    />
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm leading-6">
                <input
                  type="checkbox"
                  required
                  checked={addressConfirmed}
                  className="mt-1 size-4 shrink-0 accent-primary"
                  onChange={(event) =>
                    setAddressConfirmed(event.target.checked)
                  }
                />
                I confirm the address above is where the service is needed. It
                may differ from my browsing location.
              </label>
              {coverage.requiresProviderConfirmation && (
                <p
                  role="status"
                  className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm leading-6"
                >
                  This provider may not normally serve your selected area. You
                  can still send a request, but the provider must confirm they
                  can visit this address.
                  {coverage.status === "uncertain" &&
                    " Complete the structured address fields so coverage can be assessed."}
                </p>
              )}
              <div>
                <label htmlFor="booking-time" className="provider-label">
                  Preferred date & time (optional)
                </label>
                <Input
                  id="booking-time"
                  name="preferredDate"
                  type="datetime-local"
                  className="h-12"
                />
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Your provider confirms scheduling. Listed eligibility does not
                  guarantee an appointment time.
                </p>
              </div>
              <div>
                <label htmlFor="booking-description" className="provider-label">
                  What do you need help with? (optional)
                </label>
                <textarea
                  id="booking-description"
                  name="description"
                  maxLength={2000}
                  rows={3}
                  className="provider-textarea"
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-primary/5 p-4 text-xs leading-6 text-primary"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="public-button public-button-primary w-full"
                disabled={
                  mutation.isPending || capturePending || !addressConfirmed
                }
              >
                {mutation.isPending
                  ? "Sending request…"
                  : "Send booking request"}
                <ArrowRight className="size-4" />
              </Button>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
