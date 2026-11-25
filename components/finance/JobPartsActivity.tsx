import { dateTime, money } from "@/lib/customer-types";
import type { JobPartEventData } from "@/models/job-part-event";

type PartEvent = Pick<
  JobPartEventData,
  | "_id"
  | "action"
  | "actorName"
  | "actorRole"
  | "before"
  | "after"
  | "totalBefore"
  | "totalAfter"
> & { actorId: string; createdAt: string };
export function JobPartsActivity({ events }: { events: PartEvent[] }) {
  if (!events.length) return null;
  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-semibold">Parts activity</h2>
      <ol className="divide-y divide-border text-sm">
        {events.map((event) => {
          const part = event.after || event.before;
          return (
            <li key={event._id} className="space-y-2 py-4 first:pt-0 last:pb-0">
              <p className="break-words font-medium">
                {event.action === "part_added"
                  ? "Added"
                  : event.action === "part_updated"
                    ? "Updated"
                    : "Removed"}{" "}
                {part?.partName}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.actorName} · Pro · {dateTime(event.createdAt)}
              </p>
              <p>
                {event.before &&
                  `${event.before.qty} × ${money(event.before.unitPrice)}`}
                {event.before && " → "}
                {event.after
                  ? `${event.after.qty} × ${money(event.after.unitPrice)} = ${money(event.after.lineTotal)}`
                  : "Removed from bill"}
              </p>
              {part?.note && (
                <p className="break-words text-muted-foreground">{part.note}</p>
              )}
              <p className="text-xs">
                Running total {money(event.totalBefore)} →{" "}
                {money(event.totalAfter)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
