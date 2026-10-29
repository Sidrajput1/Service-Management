"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SkillPicker } from "@/components/provider/CatalogControls";
import type { AdminCatalogRow } from "@/lib/admin-types";
import type { MarketplaceCatalog } from "@/lib/marketplace-types";
import { AdminEmpty, StatusBadge } from "./AdminUi";

function CatalogForm({
  item,
  catalog,
  units,
  done,
}: {
  item?: AdminCatalogRow;
  catalog: MarketplaceCatalog;
  units: string[];
  done: () => void;
}) {
  const requestId = useRef("");
  const [type, setType] = useState(item?.itemType || "service"),
    [skills, setSkills] = useState(item?.skillKeys || []),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const suggestion = item?.suggestedPrice;
  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setError("");
        setPending(true);
        const fields = new FormData(event.currentTarget),
          amount = String(fields.get("price") || "");
        const unit = String(fields.get("unit") || "job"),
          city = String(fields.get("city") || "").trim();
        const referenceChanged =
          !suggestion ||
          Number(amount) !== suggestion.amount ||
          unit !== suggestion.unit ||
          city !== (suggestion.city || "");
        const reference =
          amount === ""
            ? null
            : {
                ...suggestion,
                amount: Number(amount),
                currency: "INR",
                unit,
                city: city || undefined,
                kind: referenceChanged
                  ? "configured"
                  : suggestion?.kind || "configured",
                qualification: referenceChanged
                  ? "Administrator-configured reference; confirm scope, materials and taxes. Retained source/date, if any, describe the previous reference."
                  : suggestion?.qualification ||
                    "Administrator-configured reference; confirm scope, materials and taxes.",
              };
        const payload = {
          requestId: (requestId.current ||= crypto.randomUUID()),
          expectedVersion: item?.reviewVersion,
          itemType: type,
          name: String(fields.get("name")),
          description: String(fields.get("description") || ""),
          categoryKey: String(fields.get("categoryKey") || "other"),
          skillKeys: skills,
          unit,
          price: amount === "" ? 0 : Number(amount),
          taxPercent: Number(fields.get("taxPercent")),
          isActive: fields.get("isActive") === "on",
          ...(type === "service" ? { suggestedPrice: reference } : {}),
        };
        try {
          const res = await fetch(
            item ? `/api/admin/catalog/${item._id}` : "/api/admin/catalog",
            {
              method: item ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
          const result = await res.json();
          if (!res.ok) {
            requestId.current = "";
            throw new Error(result.error || "Unable to save catalog item.");
          }
          done();
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to save. Retry this request.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="provider-label">
          Item type
          <select
            className="customer-select mt-2"
            value={type}
            disabled={Boolean(item)}
            onChange={(event) => setType(event.target.value)}
          >
            {["service", "part", "visit", "other"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="provider-label">
          Name
          <Input
            name="name"
            className="mt-2 h-11"
            required
            minLength={2}
            maxLength={150}
            defaultValue={item?.name}
          />
        </label>
        <label className="provider-label">
          Category
          <select
            name="categoryKey"
            className="customer-select mt-2"
            defaultValue={item?.categoryKey || "other"}
          >
            {catalog.categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="provider-label">
          Pricing unit
          <select
            name="unit"
            className="customer-select mt-2"
            defaultValue={item?.unit || "job"}
          >
            {[...new Set([...units, item?.unit || "job"])].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="provider-label">
          {type === "service"
            ? "Suggested reference (INR, optional)"
            : "Default item price (INR)"}
          <Input
            name="price"
            className="mt-2 h-11"
            type="number"
            step="0.01"
            min={0}
            max={1000000}
            defaultValue={
              type === "service"
                ? (suggestion?.amount ?? (item?.price ? item.price : ""))
                : (item?.price ?? 0)
            }
            required={type !== "service"}
          />
        </label>
        <label className="provider-label">
          Tax percent
          <Input
            name="taxPercent"
            className="mt-2 h-11"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={item?.taxPercent ?? 18}
            required
          />
        </label>
        {type === "service" && (
          <label className="provider-label sm:col-span-2">
            Reference city (optional)
            <Input
              name="city"
              className="mt-2 h-11"
              maxLength={80}
              defaultValue={suggestion?.city}
            />
          </label>
        )}
      </div>
      <label className="provider-label block">
        Description
        <textarea
          name="description"
          className="customer-input mt-2 min-h-28"
          maxLength={2000}
          defaultValue={item?.description}
        />
      </label>
      {type === "service" && (
        <SkillPicker
          catalog={catalog}
          value={skills}
          change={setSkills}
          retained={item?.skillKeys}
        />
      )}
      {suggestion && (
        <div className="rounded-xl bg-muted p-4 text-xs leading-6">
          <p>
            Current reference: {suggestion.kind.replaceAll("_", " ")} ·{" "}
            {suggestion.qualification}
          </p>
          {suggestion.sourceUrl && (
            <a
              className="underline"
              href={suggestion.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Retained source
            </a>
          )}
          {suggestion.checkedAt && (
            <span> · Checked {suggestion.checkedAt}</span>
          )}
          <p>
            Editing its amount, unit or city labels the reference as
            administrator configured.
          </p>
        </div>
      )}
      <label className="flex items-center gap-3 text-sm">
        <input
          name="isActive"
          type="checkbox"
          className="size-4 accent-primary"
          defaultChecked={item?.isActive ?? true}
        />
        Active for new selections
      </label>
      <p className="text-xs leading-6 text-muted-foreground">
        Saving changes this catalog item only. Deactivation prevents new
        selections and bookings; existing offerings, bookings and invoice
        amounts are retained.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Saving…" : "Confirm and save catalog item"}
      </Button>
    </form>
  );
}
export function CatalogManagement({
  items,
  catalog,
  units,
}: {
  items: AdminCatalogRow[];
  catalog: MarketplaceCatalog;
  units: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminCatalogRow | undefined>(),
    [open, setOpen] = useState(false),
    [saved, setSaved] = useState(false);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Review existing names before adding a service. Names are unique within
          each item type.
        </p>
        <Button
          className="h-11"
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          Add catalog item
        </Button>
      </div>
      {saved && (
        <p role="status" className="mb-4 text-sm">
          Catalog saved. Provider prices and historical amounts are unchanged.
        </p>
      )}
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item._id}
              className="provider-panel flex flex-wrap items-center justify-between gap-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold">{item.name}</h2>
                  <StatusBadge status={item.isActive ? "active" : "inactive"} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.itemType} ·{" "}
                  {catalog.categories.find(
                    (category) => category.key === item.categoryKey,
                  )?.label || "Other"}{" "}
                  · {item.unit}
                </p>
                <p className="mt-2 text-sm">
                  {item.itemType === "service"
                    ? item.suggestedPrice
                      ? `Suggested ₹${item.suggestedPrice.amount.toLocaleString("en-IN")} / ${item.suggestedPrice.unit} · ${item.suggestedPrice.kind.replaceAll("_", " ")}`
                      : "No suggested reference"
                    : `Default ₹${item.price.toLocaleString("en-IN")}`}
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setEditing(item);
                  setOpen(true);
                }}
              >
                Review / edit<span className="sr-only"> {item.name}</span>
              </Button>
            </article>
          ))
        ) : (
          <AdminEmpty description="No catalog items match these filters." />
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%_-_2rem)]! max-w-180! max-h-[90dvh] overflow-y-auto p-6">
          <DialogTitle>
            {editing ? `Edit ${editing.name}` : "Add catalog item"}
          </DialogTitle>
          <DialogDescription>
            Suggested prices are references. Provider verification and offering
            approval are managed in their own queues.
          </DialogDescription>
          <CatalogForm
            item={editing}
            catalog={catalog}
            units={units}
            done={() => {
              setOpen(false);
              setSaved(true);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
