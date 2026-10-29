"use client";
import { useState } from "react";
import { Plus, MapPin, Trash2 } from "lucide-react";
import {
  useProviderServiceAreas,
  useSaveProviderServiceAreas,
} from "@/hooks/useProviderOnboarding";
import {
  ProviderHeading,
  ProviderState,
  Feedback,
  errorMessage,
} from "./ProviderUi";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CoverageArea } from "@/lib/marketplace-types";
function AreaEditor({
  initial,
  legacy,
}: {
  initial: CoverageArea[];
  legacy: boolean;
}) {
  const [areas, setAreas] = useState<CoverageArea[]>(() =>
      initial.map((area) => ({
        ...area,
        _id: area._id || crypto.randomUUID(),
      })),
    ),
    [remove, setRemove] = useState<string | null>(null),
    [feedback, setFeedback] = useState("");
  const mutation = useSaveProviderServiceAreas();
  const change = (
    id: string,
    key: keyof CoverageArea,
    value: string | boolean,
  ) =>
    setAreas((current) =>
      current.map((area) =>
        area._id === id ? { ...area, [key]: value } : area,
      ),
    );
  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setFeedback("");
        try {
          await mutation.mutateAsync(areas);
          setFeedback(
            "Coverage saved. Future discovery and new requests use these active areas; existing bookings are unchanged.",
          );
        } catch (error) {
          setFeedback(errorMessage(error));
        }
      }}
    >
      {legacy && (
        <p className="rounded-xl bg-secondary p-4 text-xs leading-6 text-secondary-foreground">
          Review your legacy text areas below, fill missing city/state
          information, then save the structured coverage. Business address alone
          does not define a service area.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-6 text-muted-foreground">
          City is required. Add a locality and/or PIN to restrict coverage. PIN
          searches require an explicitly configured PIN. Add the exact PIN codes
          you serve so customers can find you by PIN.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={areas.length >= 100}
          onClick={() =>
            setAreas((current) => [
              ...current,
              {
                _id: crypto.randomUUID(),
                city: "",
                state: "",
                locality: "",
                pincode: "",
                isActive: true,
              },
            ])
          }
        >
          <Plus className="size-4" />
          Add area
        </Button>
      </div>
      {!areas.length && (
        <div className="provider-panel py-10 text-center">
          <MapPin className="mx-auto size-7 text-primary" />
          <h2 className="mt-4 font-semibold">Where does your business work?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Add a city, locality or PIN-code coverage entry to be discoverable
            there.
          </p>
        </div>
      )}
      {areas.map((area, index) => (
        <fieldset key={area._id} className="provider-panel">
          <legend className="px-2 text-xs font-semibold">
            Service area {index + 1}
          </legend>
          <div className="mb-4 flex items-center justify-between">
            <label className="flex min-h-10 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={area.isActive}
                onChange={(event) =>
                  change(area._id, "isActive", event.target.checked)
                }
                className="size-4 accent-primary"
              />
              {area.isActive ? "Active" : "Inactive"}
            </label>
            <Button
              type="button"
              variant="ghost"
              className="size-11"
              aria-label={`Remove service area ${index + 1}`}
              onClick={() => setRemove(area._id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["city", "City"],
                ["state", "State"],
                ["locality", "Locality (optional)"],
                ["pincode", "PIN code (optional)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label
                  htmlFor={`${area._id}-${key}`}
                  className="provider-label"
                >
                  {label}
                </label>
                <Input
                  id={`${area._id}-${key}`}
                  required={key === "city" || key === "state"}
                  minLength={key === "city" || key === "state" ? 2 : undefined}
                  maxLength={key === "pincode" ? 6 : 100}
                  pattern={key === "pincode" ? "[1-9][0-9]{5}" : undefined}
                  inputMode={key === "pincode" ? "numeric" : "text"}
                  value={String(area[key] || "")}
                  onChange={(event) =>
                    change(area._id, key, event.target.value)
                  }
                  className="h-11"
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <Feedback message={feedback} error={mutation.isError} />
      <Button type="submit" className="h-11 px-6" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving coverage…" : "Save service areas"}
      </Button>
      <Dialog
        open={Boolean(remove)}
        onOpenChange={(value) => {
          if (!value) setRemove(null);
        }}
      >
        <DialogContent className="w-[calc(100%_-_2rem)]! max-w-110! p-6">
          <DialogTitle>Remove this service area?</DialogTitle>
          <DialogDescription>
            This removes it from your draft. Choose Save service areas to apply
            the change to future discovery. Existing booking address snapshots
            remain intact. You can also deactivate an area instead.
          </DialogDescription>
          <Button
            type="button"
            className="h-11"
            onClick={() => {
              setAreas((current) =>
                current.filter((area) => area._id !== remove),
              );
              setRemove(null);
            }}
          >
            Remove from draft
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setRemove(null)}
          >
            Keep area
          </Button>
        </DialogContent>
      </Dialog>
    </form>
  );
}
export function ServiceAreasManager({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const query = useProviderServiceAreas();
  return (
    <>
      {!embedded && (
        <ProviderHeading
          title="Service areas"
          description="Define where your business accepts new requests. Customers see only offerings that match your active configured coverage."
        />
      )}
      <ProviderState
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      >
        {query.data && (
          <AreaEditor
            key={JSON.stringify(query.data.areas)}
            initial={query.data.areas}
            legacy={query.data.legacy}
          />
        )}
      </ProviderState>
    </>
  );
}
