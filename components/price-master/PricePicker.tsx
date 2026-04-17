"use client";

import React, { useMemo } from "react";
import { Label } from "../ui/label";

type PriceItem = {
  _id: string;
  itemType: "service" | "part" | "visit" | "other";
  name: string;
  price: number;
  unit?: string;
  isActive: boolean;
};

export default function PricePicker({
  items,
  itemType,
  value,
  onChange,
  label = "Select item",
}: {
  items: PriceItem[];
  itemType: "service" | "part" | "visit" | "other";
  value?: string;
  onChange: (item: PriceItem | null) => void;
  label?: string;
}) {
  const filtered = useMemo(
    () => items.filter((item) => item.itemType === itemType && item.isActive),
    [items, itemType],
  );

  return (
    <div className="sapce-y-2">
      <Label>{label}</Label>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
        value={value || ""}
        onChange={(e) => {
          const selected =
            filtered.find((item) => item._id === e.target.value) || null;
          onChange(selected);
        }}
      >
        <option value="">Select {itemType}</option>
        {filtered.map((item) => (
          <option key={item._id} value={item._id}>
            {item.name}-— ₹{item.price}{" "}
          </option>
        ))}
      </select>
    </div>
  );
}
