"use client";

import { useMemo, useState } from "react";
import { PackagePlus, Plus, Trash2, Calculator } from "lucide-react";

import api from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type JobPart = {
  partName: string;
  qty: number;
  price: number;
};

type JobPartsUsedProps = {
  jobId: string;
  partsUsed?: JobPart[];
  jobStatus: string;
  onUpdated?: (parts: JobPart[]) => void;
};

const EDITABLE_STATUSES = ["otp_verified", "in_progress", "on_hold", "arrived"];

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function JobPartsUsed({
  jobId,
  partsUsed = [],
  jobStatus,
  onUpdated,
}: JobPartsUsedProps) {
  console.log("Job id is", jobId);
  console.log("Job status is", jobStatus);
  const [parts, setParts] = useState<JobPart[]>(partsUsed);

  const [showForm, setShowForm] = useState(false);

  const [partName, setPartName] = useState("");

  const [qty, setQty] = useState("1");

  const [price, setPrice] = useState("");

  const [saving, setSaving] = useState(false);

  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const canEdit = EDITABLE_STATUSES.includes(jobStatus);

  console.log("Can edit", canEdit);

  const totalPartsAmount = useMemo(() => {
    return parts.reduce(
      (total, part) => total + Number(part.qty || 0) * Number(part.price || 0),
      0,
    );
  }, [parts]);

  async function handleAddPart() {
    const cleanName = partName.trim();

    const parsedQty = Number(qty);

    const parsedPrice = Number(price);

    if (!cleanName) {
      alert("Enter part name");
      return;
    }

    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      alert("Quantity must be greater than zero");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      alert("Enter a valid price");
      return;
    }

    try {
      setSaving(true);

      const { data } = await api.post(`/technician/jobs/${jobId}/parts`, {
        partName: cleanName,
        qty: parsedQty,
        price: parsedPrice,
      });

      const updatedParts = data?.partsUsed || [];

      setParts(updatedParts);

      onUpdated?.(updatedParts);

      setPartName("");
      setQty("1");
      setPrice("");
      setShowForm(false);
    } catch (error: any) {
      alert(
        error?.response?.data?.error || error?.message || "Unable to add part",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemovePart(index: number) {
    try {
      setDeletingIndex(index);

      const { data } = await api.delete(
        `/technician/jobs/${jobId}/parts/${index}`,
      );

      const updatedParts = data?.partsUsed || [];

      setParts(updatedParts);

      onUpdated?.(updatedParts);
    } catch (error: any) {
      alert(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to remove part",
      );
    } finally {
      setDeletingIndex(null);
    }
  }

  return (
    <Card className="rounded-3xl border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5" />
              Parts used
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Add any parts or materials used while completing this service.
            </p>
          </div>

          {parts.length > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {parts.length} {parts.length === 1 ? "part" : "parts"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {parts.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <PackagePlus className="mx-auto h-7 w-7 text-muted-foreground" />

            <p className="mt-3 font-medium">No parts added</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add a part when one is needed for this service.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {parts.map((part, index) => {
              const lineTotal = Number(part.qty || 0) * Number(part.price || 0);

              return (
                <div
                  key={`${part.partName}-${index}`}
                  className="rounded-2xl border bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{part.partName}</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Qty {part.qty} × {currency(part.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{currency(lineTotal)}</p>

                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-xl text-destructive hover:text-destructive"
                          disabled={deletingIndex === index}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Remove "${part.partName}" from this job`,
                            );
                            if (!confirmed) {
                              return;
                            }
                            handleRemovePart(index);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl dark:bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calculator className="h-4 w-4" />
            Parts total
          </div>

          <span className="font-semibold">{currency(totalPartsAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          *Parts added here will be included automatically in the final invoice
          when the job is completed.
        </p>

        {canEdit && !showForm && (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Part
          </Button>
        )}

        {showForm && canEdit && (
          <div className="rounded-2xl border bg-background p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="part-name">Part name</Label>

                <Input
                  id="part-name"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. Capacitor"
                  className="mt-2 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="part-qty">Quantity</Label>

                <Input
                  id="part-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="mt-2 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="part-price">Unit price</Label>

                <Input
                  id="part-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="rounded-xl "
                onClick={handleAddPart}
                disabled={saving}
              >
                {saving ? "Adding..." : "Add Part"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
