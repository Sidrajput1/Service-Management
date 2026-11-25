"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ServiceWindowInput = { start: string; end: string };
export function localServiceTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(+date)) return "";
  return new Date(+date - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function enteredServiceWindow(
  input?: ServiceWindowInput,
  saved?: { scheduledAt?: string; scheduledEndAt?: string },
) {
  if (!input) return {};
  return {
    scheduledAt:
      input.start && input.start !== localServiceTime(saved?.scheduledAt)
        ? new Date(input.start).toISOString()
        : undefined,
    scheduledEndAt:
      input.end && input.end !== localServiceTime(saved?.scheduledEndAt)
        ? new Date(input.end).toISOString()
        : undefined,
  };
}

export function ServiceWindowFields({
  value,
  onChange,
  fixedStart,
}: {
  value: ServiceWindowInput;
  onChange: (value: ServiceWindowInput) => void;
  fixedStart?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Reserved service window</legend>
      <p className="text-xs text-muted-foreground">
        Use the confirmed service times in your local time zone.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-start`}>Start</Label>
          <Input
            id={`${id}-start`}
            type="datetime-local"
            value={value.start}
            readOnly={fixedStart}
            onChange={(event) =>
              onChange({ ...value, start: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-end`}>End</Label>
          <Input
            id={`${id}-end`}
            type="datetime-local"
            value={value.end}
            min={value.start || undefined}
            onChange={(event) =>
              onChange({ ...value, end: event.target.value })
            }
          />
        </div>
      </div>
    </fieldset>
  );
}
