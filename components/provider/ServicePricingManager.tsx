"use client";
import { OfferingReviewFeedback } from "./ReviewFeedback";
import { useState } from "react";
import { Plus, Pencil, Power, Tag } from "lucide-react";
import { useProviderServiceCatalog } from "@/hooks/useProviderServiceCatalog";
import {
  useProviderServiceOfferings,
  useCreateProviderServiceOffering,
  useUpdateProviderServiceOffering,
  useDisableProviderServiceOffering,
} from "@/hooks/useProviderServiceOfferings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogPicker } from "./CatalogControls";
import {
  ProviderHeading,
  ProviderState,
  Feedback,
  errorMessage,
} from "./ProviderUi";
import type { ProviderOffering, CatalogItem } from "@/lib/marketplace-types";
import { money } from "@/lib/customer-types";

function OfferingForm({
  item,
  offering,
  save,
  pending,
}: {
  item: CatalogItem;
  offering?: ProviderOffering;
  save: (value: Record<string, unknown>) => Promise<void>;
  pending: boolean;
}) {
  const [price, setPrice] = useState(offering ? String(offering.price) : ""),
    [model, setModel] = useState(offering?.pricingModel || "fixed"),
    [unit, setUnit] = useState(offering?.unit || item.unit || "job");
  const [promotion, setPromotion] = useState(Boolean(offering?.offerEnabled)),
    [error, setError] = useState("");
  const suggestion = item.suggestedPrice;
  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setError("");
        const fields = new FormData(event.currentTarget);
        try {
          await save({
            priceItemId: item._id,
            price: model === "quote_required" ? 0 : Number(price),
            pricingModel: model,
            unit,
            taxPercent: Number(fields.get("taxPercent")),
            description: fields.get("description"),
            isActive: fields.get("isActive") === "on",
            offerEnabled: promotion && model !== "quote_required",
            offerName: String(fields.get("offerName") || ""),
            discountType: fields.get("discountType") || undefined,
            discountValue: Number(fields.get("discountValue") || 0),
            offerStartsAt: fields.get("offerStartsAt")
              ? new Date(String(fields.get("offerStartsAt"))).toISOString()
              : "",
            offerEndsAt: fields.get("offerEndsAt")
              ? new Date(String(fields.get("offerEndsAt"))).toISOString()
              : "",
          });
        } catch (failure) {
          setError(errorMessage(failure));
        }
      }}
    >
      <h3 className="font-semibold">{item.name}</h3>
      {suggestion ? (
        <div className="rounded-xl border border-border bg-secondary/50 p-4 text-xs leading-6">
          <p className="font-semibold">
            Indicative reference: {money(suggestion.amount)} / {suggestion.unit}
            {suggestion.city ? ` · ${suggestion.city}` : ""}
          </p>
          <p>{suggestion.qualification}</p>
          {suggestion.sourceUrl && (
            <a
              className="underline"
              href={suggestion.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Source listing
            </a>
          )}
          {suggestion.checkedAt && (
            <span> · Checked {suggestion.checkedAt}</span>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10"
            onClick={() => setPrice(String(suggestion.amount))}
          >
            Use as my starting input
          </Button>
        </div>
      ) : (
        <p className="rounded-xl bg-muted p-4 text-xs leading-6 text-muted-foreground">
          No verified suggested price is configured. Enter your own service
          price and scope.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="offering-model" className="provider-label">
            Pricing model
          </label>
          <select
            id="offering-model"
            className="customer-select"
            value={model}
            onChange={(event) => {
              const next = event.target.value as typeof model;
              setModel(next);
              if (next === "quote_required") setPromotion(false);
            }}
          >
            <option value="fixed">Fixed service price</option>
            <option value="starting">Starting estimate</option>
            <option value="per_unit">Per-unit price</option>
            <option value="quote_required">Quote required</option>
          </select>
        </div>
        <div>
          <label htmlFor="offering-unit" className="provider-label">
            Pricing unit
          </label>
          <select
            id="offering-unit"
            className="customer-select"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          >
            {[
              "job",
              "visit",
              "item",
              "hour",
              "sq_ft",
              "ac",
              "bathroom",
              "kitchen",
              "seat",
            ].map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="offering-price" className="provider-label">
            Your price (INR)
          </label>
          <Input
            id="offering-price"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required={model !== "quote_required"}
            disabled={model === "quote_required"}
            value={model === "quote_required" ? "" : price}
            onChange={(event) => setPrice(event.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <label htmlFor="offering-tax" className="provider-label">
            Tax percent
          </label>
          <Input
            id="offering-tax"
            name="taxPercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={offering?.taxPercent ?? item.taxPercent ?? 18}
            required
            className="h-11"
          />
        </div>
      </div>
      {model === "quote_required" && (
        <p className="text-xs leading-6 text-muted-foreground">
          This offering will show “Quote required”. Online booking is disabled
          until a separate approved quotation workflow is available; it will
          never be sold as a free service.
        </p>
      )}
      {model === "starting" && (
        <p className="text-xs leading-6 text-muted-foreground">
          Customers see this as a starting estimate. Describe the included scope
          and possible additional work clearly.
        </p>
      )}
      <div>
        <label htmlFor="offering-description" className="provider-label">
          Service scope & exclusions
        </label>
        <textarea
          id="offering-description"
          name="description"
          maxLength={2000}
          rows={3}
          defaultValue={offering?.description || ""}
          className="provider-textarea"
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={offering?.isActive ?? true}
          className="size-4 accent-primary"
        />
        Active offering
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={promotion}
          disabled={model === "quote_required"}
          onChange={(event) => setPromotion(event.target.checked)}
          className="size-4 accent-primary"
        />
        Run a promotion
      </label>
      {promotion && (
        <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <legend className="px-2 text-xs font-semibold">
            Promotion details
          </legend>
          <div className="sm:col-span-2">
            <label htmlFor="offer-name" className="provider-label">
              Promotion name
            </label>
            <Input
              id="offer-name"
              name="offerName"
              required
              maxLength={120}
              defaultValue={offering?.offerName || ""}
            />
          </div>
          <div>
            <label htmlFor="discount-type" className="provider-label">
              Discount type
            </label>
            <select
              id="discount-type"
              name="discountType"
              className="customer-select"
              defaultValue={offering?.discountType || "percentage"}
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat INR amount</option>
            </select>
          </div>
          <div>
            <label htmlFor="discount-value" className="provider-label">
              Discount value
            </label>
            <Input
              id="discount-value"
              name="discountValue"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={offering?.discountValue || ""}
            />
          </div>
          {(["offerStartsAt", "offerEndsAt"] as const).map((key) => (
            <div key={key}>
              <label htmlFor={key} className="provider-label">
                {key === "offerStartsAt" ? "Starts" : "Ends"} (optional)
              </label>
              <Input
                id={key}
                name={key}
                type="datetime-local"
                defaultValue={
                  offering?.[key]
                    ? new Date(
                        new Date(offering[key]!).getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
            </div>
          ))}
        </fieldset>
      )}
      <Feedback message={error} error />
      <Button type="submit" disabled={pending} className="h-11 px-6">
        {pending ? "Saving…" : "Save offering"}
      </Button>
    </form>
  );
}
export function ServicePricingManager({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const catalog = useProviderServiceCatalog(),
    query = useProviderServiceOfferings(),
    create = useCreateProviderServiceOffering(),
    update = useUpdateProviderServiceOffering(),
    disable = useDisableProviderServiceOffering();
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(""),
    [editing, setEditing] = useState<ProviderOffering | undefined>(),
    [confirm, setConfirm] = useState<ProviderOffering | null>(null),
    [feedback, setFeedback] = useState("");
  const offerings = query.data?.offerings || [];
  const item =
    catalog.data?.services.find((service) => service._id === selected) ||
    editing?.priceItemId ||
    undefined;
  return (
    <>
      {!embedded && (
        <ProviderHeading
          title="Services & pricing"
          description="Choose what you offer, set your prices, and manage promotions. Historical booking and invoice prices stay unchanged."
        />
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {offerings.length} configured offerings
        </p>
        <Button
          className="h-11 px-5"
          onClick={() => {
            setEditing(undefined);
            setSelected("");
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add service
        </Button>
      </div>
      <Feedback message={feedback} />
      <ProviderState
        loading={catalog.isLoading || query.isLoading}
        error={catalog.isError || query.isError}
        retry={() => {
          catalog.refetch();
          query.refetch();
        }}
      >
        <div className="space-y-3">
          {!offerings.length && (
            <div className="provider-panel py-12 text-center">
              <h2 className="font-semibold">Your service menu starts here</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Choose a catalog service and set your own price. No service is
                enabled automatically.
              </p>
            </div>
          )}
          {offerings.map((offering) => (
            <article
              key={offering._id}
              className="provider-panel flex flex-wrap items-center justify-between gap-5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold">{offering.name}</h2>
                  <span className="provider-badge">
                    {offering.isActive ? "Enabled by you" : "Disabled by you"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {offering.pricingModel === "quote_required"
                    ? "Quote required · no online payable amount"
                    : `${offering.pricingModel === "starting" ? "From " : ""}${money(offering.price)} / ${offering.unit || "job"} + ${offering.taxPercent}% tax`}
                </p>
                <OfferingReviewFeedback offering={offering} />
                {offering.offerEnabled && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-primary">
                    <Tag className="size-3" />
                    {offering.offerName}
                  </p>
                )}
                {!offering.priceItemId?.isActive && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Catalog item inactive. Historical records are retained.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setEditing(offering);
                    setSelected(offering.priceItemId?._id || "");
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                {offering.isActive && (
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => setConfirm(offering)}
                  >
                    <Power className="size-4" />
                    Disable
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </ProviderState>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%_-_2rem)]! max-w-170! max-h-[92dvh] overflow-y-auto rounded-2xl p-6">
          <DialogTitle>
            {editing ? "Edit service offering" : "Add a catalog service"}
          </DialogTitle>
          <DialogDescription>
            Your business sets its own price. Suggested references are separate
            from the price saved to your offering. New services and edits to
            descriptions, units, pricing models or promotion claims require
            review; ordinary price changes retain approval. Both your business
            and service must be approved before publication.
          </DialogDescription>
          {!editing && catalog.data && (
            <CatalogPicker
              catalog={catalog.data}
              selected={selected}
              disabledIds={offerings
                .filter((value) => value.isActive)
                .map((value) => value.priceItemId?._id || "")}
              change={setSelected}
            />
          )}
          {item && (
            <OfferingForm
              key={item._id}
              item={item}
              offering={editing}
              pending={create.isPending || update.isPending}
              save={async (value) => {
                if (editing)
                  await update.mutateAsync({ id: editing._id, payload: value });
                else
                  await create.mutateAsync(
                    value as Parameters<typeof create.mutateAsync>[0],
                  );
                setFeedback(
                  "Service offering saved. New offerings and scope changes await review.",
                );
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(value) => {
          if (!value) setConfirm(null);
        }}
      >
        <DialogContent className="w-[calc(100%_-_2rem)]! max-w-110! p-6">
          <DialogTitle>Disable this offering?</DialogTitle>
          <DialogDescription>
            It will leave future discovery. Existing requests, bookings and
            invoices keep their saved service details and prices.
          </DialogDescription>
          <Feedback
            message={disable.isError ? errorMessage(disable.error) : ""}
            error
          />
          <Button
            className="h-11"
            disabled={disable.isPending}
            onClick={async () => {
              if (!confirm) return;
              try {
                await disable.mutateAsync(confirm._id);
                setConfirm(null);
              } catch {
                /* Inline failure remains visible. */
              }
            }}
          >
            Disable offering
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setConfirm(null)}
          >
            Keep offering
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
