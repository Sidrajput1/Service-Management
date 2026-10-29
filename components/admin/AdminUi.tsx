import Link from "next/link";
import { dateTime } from "@/lib/customer-types";
import type { AuditRow } from "@/lib/admin-types";
export function AdminHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <p className="public-eyebrow mb-2">SERVIZATO ADMINISTRATION</p>
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const positive = ["verified", "approved", "active"].includes(status),
    negative = ["rejected", "suspended", "inactive"].includes(status);
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${positive ? "border-brand-teal/25 bg-brand-teal/10 text-secondary-foreground" : negative ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function AdminEmpty({
  title = "Nothing to review here",
  description = "Try another filter or return when a new application is submitted.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="provider-panel py-12 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
export function AdminReadError({ error }: { error: unknown }) {
  const safeMessage =
    error &&
    typeof error === "object" &&
    "status" in error &&
    [400, 404].includes(Number(error.status)) &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "The information is temporarily unavailable. Reload this page to try again.";
  return (
    <div role="alert" className="provider-panel">
      <h2 className="font-semibold">This view could not be loaded</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {safeMessage}
      </p>
      <Link href="/admin/dashboard" className="public-text-link mt-4">
        Return to overview
      </Link>
      <a href="" className="public-text-link ml-5">
        Reload this view
      </a>
    </div>
  );
}
export function AdminPagination({
  base,
  params,
  nextCursor,
  previousCursor,
}: {
  base: string;
  params: Record<string, unknown>;
  nextCursor: string | null;
  previousCursor: string | null;
}) {
  const href = (cursor: string, direction: string) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(
          ([, value]) => typeof value === "string" || typeof value === "number",
        )
        .map(([key, value]) => [key, String(value)]),
    );
    query.set("cursor", cursor);
    query.set("direction", direction);
    return `${base}?${query}`;
  };
  return (
    <nav
      aria-label="Review queue pagination"
      className="mt-6 flex flex-wrap justify-between gap-3"
    >
      {previousCursor ? (
        <Link
          className="public-button public-button-outline"
          href={href(previousCursor, "previous")}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      {nextCursor && (
        <Link
          className="public-button public-button-outline"
          href={href(nextCursor, "next")}
        >
          Next page
        </Link>
      )}
    </nav>
  );
}
export function AuditHistory({ rows }: { rows: AuditRow[] }) {
  return (
    <section className="provider-panel">
      <h2 className="font-semibold">Review history</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Latest 12 recorded actions. Earlier decisions remain in the audit
        record.
      </p>
      {!rows.length ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No review decisions have been recorded.
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize">
                  {row.action.replaceAll("_", " ")}
                </p>
                <time className="text-xs text-muted-foreground">
                  {dateTime(row.createdAt)}
                </time>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.actorKind === "admin" ? "Admin" : "Business owner"} ·{" "}
                {row.actorId || "Operator"}
                {row.notificationState === "pending"
                  ? " · Notification queued for retry"
                  : ""}
              </p>
              {row.reason && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {row.reason}
                </p>
              )}
              <p className="mt-2 break-words text-xs leading-6 text-muted-foreground">
                {Object.entries(row.before)
                  .filter(([key]) =>
                    ["verificationStatus", "approvalStatus", "status"].includes(
                      key,
                    ),
                  )
                  .map(
                    ([key, value]) =>
                      `${String(value).replaceAll("_", " ")} → ${String(row.after[key] ?? value).replaceAll("_", " ")}`,
                  )
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
