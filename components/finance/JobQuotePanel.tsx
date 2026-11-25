"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { dateTime, money } from "@/lib/customer-types";
import type { QuoteLine, QuotePricing, QuoteView } from "@/models/job-quote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Charge = Pick<QuoteLine, "description" | "qty" | "unitPrice"> & {
  chargeType: Exclude<QuoteLine["chargeType"], "service">;
};
type ProviderView = {
  latest: QuoteView | null;
  authorized: QuoteView | null;
  canSubmit: boolean;
  approvedAmount: number | null;
  base: QuotePricing;
  draftParts: Charge[];
  partsDraftVersion: number;
};
const chargeLabels = {
  service: "Service",
  part: "Part",
  labour: "Labour",
  visit: "Visit",
  other: "Other charge",
};

export function jobActionError(error: unknown, fallback: string) {
  return isAxiosError<{ error?: string }>(error)
    ? error.response?.data?.error || fallback
    : fallback;
}

function QuoteBreakdown({ quote }: { quote: QuoteView }) {
  const { pricing } = quote;
  const rows = [
    [
      `Original service · ${pricing.items[0]?.description ?? "Service"}`,
      money(pricing.serviceBeforeDiscount),
    ],
    ...pricing.items
      .filter((item) => item.chargeType !== "service")
      .map((item) => [
        `${chargeLabels[item.chargeType]} · ${item.description} (${item.qty} × ${money(item.unitPrice)})`,
        money(item.amount),
      ]),
    ["Discount", money(pricing.discountAmount ? -pricing.discountAmount : 0)],
    ["Taxable amount", money(pricing.taxableAmount)],
    [`GST (${pricing.taxPercent}%)`, money(pricing.taxAmount)],
    [
      "Previously approved payable",
      quote.previousApprovedAmount === null
        ? "Unavailable"
        : money(quote.previousApprovedAmount),
    ],
    [
      "Change in payable",
      quote.delta === null
        ? "Unavailable"
        : `${quote.delta > 0 ? "+" : ""}${money(quote.delta)}`,
    ],
    ["Revised total payable", money(pricing.grandTotal)],
  ];
  const status = {
    pending_customer_approval: "Awaiting customer approval",
    approved:
      quote.approvalSource === "customer"
        ? "Approved by customer"
        : "Within the previously approved total",
    rejected: "Declined by customer",
    superseded: "Replaced by a newer revision",
  };
  return (
    <div className="space-y-4 text-sm">
      <p className="font-medium" role="status">
        Revision {quote.version} · {status[quote.status]}
        {quote.decidedAt && ` · ${dateTime(quote.decidedAt)}`}
      </p>
      {quote.reason && (
        <p className="break-words text-muted-foreground">{quote.reason}</p>
      )}
      <dl className="divide-y divide-border">
        {rows.map(([label, value], index) => (
          <div
            key={index}
            className="flex justify-between gap-4 py-2 last:font-semibold"
          >
            <dt className="min-w-0 break-words">{label}</dt>
            <dd className="shrink-0 text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CustomerQuotePanel({
  bookingId,
  quote,
  canRespond,
  refresh,
}: {
  bookingId: string;
  quote: QuoteView;
  canRespond: boolean;
  refresh: () => void;
}) {
  const response = useMutation({
    mutationFn: async (decision: "approve" | "reject") => {
      await api.post(`/customer/bookings/${bookingId}/quote`, {
        decision,
        version: quote.version,
      });
    },
    onSuccess: refresh,
  });
  return (
    <section className="customer-panel space-y-4">
      <h2 className="font-display text-lg font-semibold">
        Revised service quote
      </h2>
      <QuoteBreakdown quote={quote} />
      {quote.status === "pending_customer_approval" && canRespond && (
        <>
          <p className="text-sm text-muted-foreground">
            Review the new scope and total before authorizing the additional
            work.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={response.isPending || response.isSuccess}
              onClick={() => response.mutate("approve")}
            >
              Approve revised quote
            </Button>
            <Button
              variant="outline"
              disabled={response.isPending || response.isSuccess}
              onClick={() => response.mutate("reject")}
            >
              Reject revised quote
            </Button>
          </div>
        </>
      )}
      {response.isError && (
        <p role="alert" className="text-sm text-destructive">
          {jobActionError(
            response.error,
            "Could not save your response. Refresh the booking and try again.",
          )}
        </p>
      )}
    </section>
  );
}

type EditableCharge = Charge & { key: number };
const emptyCharge: Charge = {
  chargeType: "part",
  description: "",
  qty: 1,
  unitPrice: 0,
};

function ProviderQuoteForm({
  jobId,
  data,
  refresh,
}: {
  jobId: string;
  data: ProviderView;
  refresh: () => void;
}) {
  const id = useId();
  const savedCharges = data.latest?.pricing.items.flatMap((item): Charge[] =>
    item.chargeType === "service"
      ? []
      : [{ ...item, chargeType: item.chargeType }],
  );
  const startingCharges = savedCharges ?? data.draftParts;
  const nextKey = useRef(startingCharges.length);
  const command = useRef<{ payload: string; id: string } | null>(null);
  const [charges, setCharges] = useState<EditableCharge[]>(() =>
    startingCharges.map((charge, key) => ({ ...charge, key })),
  );
  const [reason, setReason] = useState("");
  const submit = useMutation({
    mutationFn: async (payload: {
      charges: Charge[];
      reason: string;
      partsDraftVersion: number;
      expectedVersion: number;
    }) => {
      const serialized = JSON.stringify(payload);
      if (command.current?.payload !== serialized)
        command.current = { payload: serialized, id: crypto.randomUUID() };
      await api.post(`/service-provider/assigned-jobs/${jobId}/quote`, {
        ...payload,
        requestId: command.current.id,
      });
    },
    onSuccess: refresh,
  });
  function change(key: number, update: Partial<Charge>) {
    setCharges((current) =>
      current.map((charge) =>
        charge.key === key ? { ...charge, ...update } : charge,
      ),
    );
  }
  function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit.mutate({
      charges: charges.map(({ chargeType, description, qty, unitPrice }) => ({
        chargeType,
        description,
        qty,
        unitPrice,
      })),
      reason,
      partsDraftVersion: data.partsDraftVersion,
      expectedVersion: data.latest?.version ?? 0,
    });
  }
  return (
    <form onSubmit={submitQuote} className="space-y-4 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Enter every additional charge for the revised scope. Continue only the
        work already authorized and pause additional work while approval is
        pending.
        Parts saved by the assigned Pro during the service are included in the
        running bill separately.
      </p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <dt className="text-muted-foreground">Previously approved payable</dt>
          <dd>
            {data.approvedAmount === null
              ? "Unavailable"
              : money(data.approvedAmount)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Payable for base service</dt>
          <dd>{money(data.base.grandTotal)}</dd>
        </div>
      </dl>
      {data.draftParts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pro’s draft parts</p>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {data.draftParts.map((part, index) => (
              <li key={index}>
                {part.description} · {part.qty} × {money(part.unitPrice)}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const parts = data.draftParts.map((part) => ({
                ...part,
                key: nextKey.current++,
              }));
              setCharges((current) => [
                ...current.filter((charge) => charge.chargeType !== "part"),
                ...parts,
              ]);
            }}
          >
            Use draft parts
          </Button>
        </div>
      )}
      {charges.map((charge) => {
        const prefix = `${id}-${charge.key}`;
        return (
          <fieldset
            key={charge.key}
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <legend className="sr-only">Additional charge</legend>
            <div className="space-y-1">
              <Label htmlFor={`${prefix}-type`}>Type</Label>
              <select
                id={`${prefix}-type`}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={charge.chargeType}
                onChange={(event) =>
                  change(charge.key, {
                    chargeType: event.target.value as Charge["chargeType"],
                  })
                }
              >
                <option value="part">Part</option>
                <option value="labour">Labour</option>
                <option value="visit">Visit</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${prefix}-description`}>Description</Label>
              <Input
                id={`${prefix}-description`}
                required
                maxLength={300}
                value={charge.description}
                onChange={(event) =>
                  change(charge.key, { description: event.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${prefix}-qty`}>Quantity</Label>
              <Input
                id={`${prefix}-qty`}
                type="number"
                required
                min="0"
                max="1000000"
                step="any"
                value={charge.qty || ""}
                onChange={(event) =>
                  change(charge.key, { qty: Number(event.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${prefix}-price`}>Unit price (₹)</Label>
              <Input
                id={`${prefix}-price`}
                type="number"
                required
                min="0"
                max="10000000"
                step="0.01"
                value={charge.unitPrice}
                onChange={(event) =>
                  change(charge.key, { unitPrice: Number(event.target.value) })
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCharges((current) =>
                  current.filter((row) => row.key !== charge.key),
                )
              }
            >
              Remove charge
            </Button>
          </fieldset>
        );
      })}
      <Button
        type="button"
        variant="outline"
        disabled={charges.length >= 100}
        onClick={() => {
          const charge = { ...emptyCharge, key: nextKey.current++ };
          setCharges((current) => [...current, charge]);
        }}
      >
        Add charge
      </Button>
      <div className="space-y-1">
        <Label htmlFor={`${id}-reason`}>Reason for the revised scope</Label>
        <Textarea
          id={`${id}-reason`}
          value={reason}
          maxLength={1000}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      {submit.isError && (
        <p role="alert" className="text-sm text-destructive">
          {jobActionError(submit.error, "Could not submit the quote.")}
        </p>
      )}
      <Button type="submit" disabled={submit.isPending || submit.isSuccess}>
        Submit revised quote
      </Button>
    </form>
  );
}

export function ProviderQuotePanel({ jobId }: { jobId: string }) {
  const path = `/service-provider/assigned-jobs/${jobId}/quote`;
  const query = useQuery({
    queryKey: ["provider-job-quote", jobId],
    queryFn: async () => (await api.get<ProviderView>(path)).data,
    refetchInterval: 10_000,
  });
  const { data } = query;
  if (!data && !query.isError) return null;
  if (data && !data.canSubmit && !data.latest) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Service quote approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isError && (
          <p role="alert" className="text-sm text-destructive">
            {jobActionError(query.error, "Could not load the current quote.")}
          </p>
        )}
        {data?.latest && <QuoteBreakdown quote={data.latest} />}
        {data?.authorized &&
          data.authorized.version !== data.latest?.version && (
            <p className="text-sm">
              Authorized revision {data.authorized.version} ·{" "}
              {money(data.authorized.pricing.grandTotal)}
            </p>
          )}
        {data?.canSubmit && !query.isError && (
          <details open={data.latest?.status === "pending_customer_approval" || data.draftParts.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">
              Propose a scope or price change
            </summary>
            <ProviderQuoteForm
              key={`${data.latest?.version ?? 0}:${data.partsDraftVersion}`}
              jobId={jobId}
              data={data}
              refresh={() => void query.refetch()}
            />
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export function ProviderStartCodePanel({ jobId }: { jobId: string }) {
  const path = `/service-provider/assigned-jobs/${jobId}/start-code`;
  const query = useQuery({
    queryKey: ["provider-job-start-code", jobId],
    queryFn: async () =>
      (await api.get<{ canIssue: boolean; locked: boolean }>(path)).data,
    refetchInterval: 10_000,
  });
  const issue = useMutation({
    mutationFn: async () => {
      await api.post(path, {});
    },
    onSuccess: () => void query.refetch(),
  });
  if (!query.data?.canIssue && !issue.isSuccess) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!query.data?.canIssue && issue.isSuccess ? (
          <p role="status" className="text-sm">
            A new code is available in the customer’s booking. Ask them to
            refresh the page.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {query.data?.locked
                ? "Verification is locked after five incorrect codes."
                : "The current verification code is unavailable."}
            </p>
            <Button
              variant="outline"
              disabled={issue.isPending}
              onClick={() => issue.mutate()}
            >
              Issue new verification code
            </Button>
          </>
        )}
        {issue.isError && (
          <p role="alert" className="text-sm text-destructive">
            {jobActionError(issue.error, "Could not issue a new code.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
