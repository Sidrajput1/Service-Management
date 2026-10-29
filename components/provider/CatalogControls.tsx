"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { normalizeKey } from "@/lib/marketplace-policy.mjs";
import type { MarketplaceCatalog } from "@/lib/marketplace-types";
export function CatalogPicker({
  catalog,
  selected,
  disabledIds = [],
  change,
}: {
  catalog: MarketplaceCatalog;
  selected: string;
  disabledIds?: string[];
  change: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const items = catalog.services.filter((item) =>
    normalizeKey(
      `${item.name} ${catalog.categories.find((category) => category.key === item.categoryKey)?.label || "Other services"}`,
    ).includes(normalizeKey(search)),
  );
  return (
    <div className="space-y-3">
      <label htmlFor="catalog-search" className="block text-xs font-semibold">
        Find a catalog service
      </label>
      <Input
        id="catalog-search"
        className="h-11"
        placeholder="Search services or categories"
        maxLength={100}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <label htmlFor="catalog-selection" className="sr-only">
        Catalog service
      </label>
      <select
        id="catalog-selection"
        className="customer-select"
        value={selected}
        onChange={(event) => change(event.target.value)}
      >
        <option value="">Choose a service</option>
        {catalog.categories.map((category) => {
          const rows = items.filter(
            (item) => (item.categoryKey || "other") === category.key,
          );
          return rows.length ? (
            <optgroup key={category.key} label={category.label}>
              {rows.map((item) => (
                <option
                  key={item._id}
                  value={item._id}
                  disabled={disabledIds.includes(item._id)}
                >
                  {item.name}
                  {disabledIds.includes(item._id)
                    ? " — already configured"
                    : ""}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
      <p className="text-xs text-muted-foreground">
        {items.length} matching catalog services. Existing services remain
        available for editing.
      </p>
    </div>
  );
}
export function SkillPicker({
  catalog,
  value,
  change,
  retained = [],
}: {
  catalog: MarketplaceCatalog;
  value: string[];
  change: (keys: string[]) => void;
  retained?: string[];
}) {
  const [search, setSearch] = useState("");
  const toggle = (key: string, checked: boolean) =>
    change(
      checked
        ? [...new Set([...value, key])]
        : value.filter((item) => item !== key),
    );
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold">Catalog skills</legend>
      <label htmlFor="skill-search" className="sr-only">
        Search skills
      </label>
      <Input
        id="skill-search"
        placeholder="Search skills"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="h-11"
      />
      <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-border p-4">
        {catalog.categories.map((category) => {
          const skills = catalog.skills.filter(
            (skill) =>
              skill.categoryKey === category.key &&
              normalizeKey(`${skill.label} ${category.label}`).includes(
                normalizeKey(search),
              ),
          );
          return skills.length ? (
            <div key={category.key}>
              <p className="mb-2 text-xs font-bold text-muted-foreground">
                {category.label}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {skills.map((skill) => (
                  <label
                    key={skill.key}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg bg-muted/40 px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={value.includes(skill.key)}
                      onChange={(event) =>
                        toggle(skill.key, event.target.checked)
                      }
                    />
                    {skill.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null;
        })}
        {retained
          .filter((key) => !catalog.skills.some((skill) => skill.key === key))
          .map((key) => (
            <label
              key={key}
              className="flex min-h-10 items-center gap-3 text-xs"
            >
              <input
                type="checkbox"
                checked={value.includes(key)}
                onChange={(event) => toggle(key, event.target.checked)}
              />
              {key} · retained legacy/inactive skill
            </label>
          ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length} selected. Inactive skills can be retained on an existing
        Pro, but cannot be newly assigned.
      </p>
    </fieldset>
  );
}
