"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useRefreshTechnicianJob } from "@/hooks/useTechnicianJobs";
import {
  createTechnicianActionGate,
  technicianMutationMessage,
} from "@/lib/technician-workflow.mjs";
import type { TechnicianJobPart } from "@/lib/technician-job-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type CatalogPart = { _id: string; name: string; price: number; unit?: string };
function currency(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(value)
    : "Not recorded";
}
export default function JobPartsUsed({
  jobId,
  partsUsed = [],
  partsVersion = 0,
  jobStatus,
  readOnly = false,
  actionGate,
  onBusyChange,
}: {
  jobId: string;
  partsUsed?: TechnicianJobPart[];
  partsVersion?: number;
  jobStatus: string;
  readOnly?: boolean;
  actionGate?: ReturnType<typeof createTechnicianActionGate>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const refresh = useRefreshTechnicianJob(jobId);
  const [ownGate] = useState(() => createTechnicianActionGate());
  const gate = actionGate || ownGate;
  const [form, setForm] = useState<"new" | TechnicianJobPart | null>(null);
  const [partName, setPartName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [busy, setBusy] = useState(false);
  const command = useRef<{ payload: string; requestId: string } | null>(null);
  const canEdit = !readOnly && jobStatus === "in_progress";
  const catalog = useQuery({
    queryKey: ["technician-job-parts", jobId],
    queryFn: async ({ signal }) =>
      (
        await api.get<{ items: CatalogPart[] }>(
          `/technician/jobs/${jobId}/parts`,
          { signal },
        )
      ).data,
    enabled: canEdit,
    gcTime: 0,
    retry: 1,
  });
  function edit(part?: TechnicianJobPart) {
    setForm(part || "new");
    setPartName(part?.partName || "");
    setQty(String(part?.qty ?? 1));
    setPrice(part?.price == null ? "" : String(part.price));
    setNote(part?.note || "");
    setCatalogId("");
  }
  async function save(
    action: "add" | "update" | "remove",
    part?: TechnicianJobPart,
  ) {
    if (!canEdit || gate.isBusy()) return;
    const parsedQty = Number(qty),
      parsedPrice = Number(price);
    if (
      action !== "remove" &&
      (!qty.trim() ||
        !Number.isFinite(parsedQty) ||
        parsedQty <= 0 ||
        !price.trim() ||
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0 ||
        !partName.trim())
    ) {
      toast.error(
        "Enter the part name, a positive quantity and a valid unit price.",
      );
      return;
    }
    const input =
      action === "add"
        ? {
            partName: partName.trim(),
            qty: parsedQty,
            price: parsedPrice,
            ...(catalogId ? { priceItemId: catalogId } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
          }
        : {
            expectedVersion: partsVersion,
            ...(action === "update" ? { qty: parsedQty } : {}),
          };
    const payload = JSON.stringify({ action, partId: part?.partId, ...input });
    if (command.current?.payload !== payload)
      command.current = { payload, requestId: crypto.randomUUID() };
    const body = { ...input, requestId: command.current.requestId };
    await gate.run(async () => {
      setBusy(true);
      onBusyChange?.(true);
      try {
        const path = `/technician/jobs/${jobId}/parts`;
        if (action === "add") await api.post(path, body);
        else if (action === "update")
          await api.patch(`${path}/${part!.partId}`, body);
        else await api.delete(`${path}/${part!.partId}`, { data: body });
        command.current = null;
        setForm(null);
        toast.success(
          action === "remove"
            ? "Part removed. Running bill updated."
            : "Part saved. Running bill updated.",
        );
      } catch (error) {
        toast.error(
          technicianMutationMessage(
            error,
            "Part update was not confirmed. Refresh and try again.",
          ),
        );
      } finally {
        await refresh();
        setBusy(false);
        onBusyChange?.(false);
      }
    });
  }
  return (
    <Card className="min-w-0 rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus className="size-5" /> Service parts
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Save parts used during this service. The running bill updates
          automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!partsUsed.length && (
          <p className="text-sm text-muted-foreground">No parts added.</p>
        )}
        {partsUsed.map((part, index) => (
          <article
            key={part.partId || index}
            className="min-w-0 space-y-2 rounded-xl border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-medium">{part.partName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {part.qty} × {currency(part.price)}
                </p>
              </div>
              <p className="font-semibold tabular-nums">
                {currency(
                  part.price == null ? undefined : part.qty * part.price,
                )}
              </p>
            </div>
            {part.note && (
              <p className="break-words text-xs text-muted-foreground">
                {part.note}
              </p>
            )}
            {part.source !== "on_site" ? (
              <p className="text-xs text-muted-foreground">
                Earlier draft part. Your provider manages its quote review.
              </p>
            ) : (
              canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => edit(part)}
                  >
                    <Pencil className="size-3" /> Change quantity
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void save("remove", part)}
                  >
                    <Trash2 className="size-3" /> Remove
                  </Button>
                </div>
              )
            )}
          </article>
        ))}
        {canEdit && !form && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={busy}
            onClick={() => edit()}
          >
            <Plus className="size-4" /> Add Part
          </Button>
        )}
        {form && canEdit && (
          <form
            className="space-y-4 rounded-xl border p-4"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              void save(
                form === "new" ? "add" : "update",
                form === "new" ? undefined : form,
              );
            }}
          >
            {form === "new" && (
              <label className="block space-y-2 text-sm">
                <span>Catalog part</span>
                <select
                  className="h-10 w-full rounded-md border bg-background px-2"
                  value={catalogId}
                  onChange={(event) => {
                    const id = event.target.value,
                      part = catalog.data?.items.find(
                        (item) => item._id === id,
                      );
                    setCatalogId(id);
                    setPartName(part?.name || "");
                    setPrice(part ? String(part.price) : "");
                  }}
                >
                  <option value="">Enter a part manually</option>
                  {catalog.data?.items.map((part) => (
                    <option key={part._id} value={part._id}>
                      {part.name} · {currency(part.price)}
                      {part.unit ? ` / ${part.unit}` : ""}
                    </option>
                  ))}
                </select>
                {catalog.isError && (
                  <span className="block text-xs text-muted-foreground">
                    Catalog unavailable. You can enter the part name and price.
                  </span>
                )}
              </label>
            )}
            <div className="space-y-2">
              <Label htmlFor="part-name">Part name</Label>
              <Input
                id="part-name"
                required
                maxLength={300}
                value={partName}
                readOnly={Boolean(catalogId) || form !== "new"}
                onChange={(event) => setPartName(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="part-qty">Quantity</Label>
                <Input
                  id="part-qty"
                  type="number"
                  required
                  min="0"
                  max="1000000"
                  step="any"
                  value={qty}
                  onChange={(event) => setQty(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part-price">Unit price (₹)</Label>
                <Input
                  id="part-price"
                  type="number"
                  required
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={price}
                  readOnly={Boolean(catalogId) || form !== "new"}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </div>
            {form === "new" && (
              <div className="space-y-2">
                <Label htmlFor="part-note">Reason or note (optional)</Label>
                <Input
                  id="part-note"
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            )}
            <p className="text-sm">
              Line total{" "}
              <strong>
                {qty.trim() && price.trim()
                  ? currency(Number(qty) * Number(price))
                  : "—"}
              </strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save part"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
