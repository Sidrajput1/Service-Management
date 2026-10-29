import Link from "next/link";
import { readOfferings } from "@/lib/admin-data";
import {
  AdminHeading,
  AdminEmpty,
  AdminPagination,
  AdminReadError,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { money } from "@/lib/customer-types";
export default async function OfferingQueue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let data;
  try {
    data = await readOfferings({
      status: "pending",
      ...(await searchParams),
    });
  } catch (error) {
    return <AdminReadError error={error} />;
  }
  return (
    <>
      <AdminHeading
        title="Service approvals"
        description="Review each provider’s offering independently. An approved service stays unpublished until its business is also verified and active."
      />
      <form
        method="get"
        className="provider-panel mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div>
          <label htmlFor="offering-search" className="provider-label">
            Service name
          </label>
          <input
            id="offering-search"
            name="q"
            defaultValue={data.filters.q}
            maxLength={100}
            className="customer-input"
          />
        </div>
        <div>
          <label htmlFor="offering-business" className="provider-label">
            Business name (optional)
          </label>
          <input
            id="offering-business"
            name="providerName"
            defaultValue={data.filters.providerName}
            maxLength={100}
            className="customer-input"
          />
        </div>
        <div>
          <label htmlFor="offering-status" className="provider-label">
            Offering approval
          </label>
          <select
            id="offering-status"
            name="status"
            defaultValue={data.filters.status || "all"}
            className="customer-select"
          >
            {[
              "all",
              "pending",
              "approved",
              "changes_requested",
              "rejected",
            ].map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <button className="public-button public-button-primary" type="submit">
            Apply filters
          </button>
          <Link href="/admin/service-approvals" className="public-text-link">
            Reset
          </Link>
        </div>
        {data.filters.providerId && (
          <input
            type="hidden"
            name="providerId"
            value={data.filters.providerId}
          />
        )}
      </form>
      {data.filters.providerId && (
        <p className="mb-5 text-xs text-muted-foreground">
          Filtered to one provider.{" "}
          <Link
            className="underline"
            href={`/admin/providers/${data.filters.providerId}`}
          >
            Review that business
          </Link>{" "}
          or reset filters to search all.
        </p>
      )}
      {!data.items.length ? (
        <AdminEmpty />
      ) : (
        <div className="space-y-3">
          {data.items.map((offering) => (
            <article
              key={offering._id}
              className="provider-panel flex flex-wrap items-center justify-between gap-5"
            >
              <div>
                <h2 className="font-semibold">{offering.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {offering.providerName} ·{" "}
                  {offering.pricingModel === "quote_required"
                    ? "Quote required"
                    : `${money(offering.price)} / ${offering.unit.replaceAll("_", " ")}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">
                    Offering:
                  </span>
                  <StatusBadge status={offering.approvalStatus} />
                  <span className="ml-2 text-xs text-muted-foreground">
                    Business:
                  </span>
                  <StatusBadge status={offering.providerVerificationStatus} />
                  {!offering.isActive && <StatusBadge status="inactive" />}
                </div>
              </div>
              <Link
                href={`/admin/service-approvals/${offering._id}`}
                className="public-button public-button-outline"
              >
                Review offering
              </Link>
            </article>
          ))}
        </div>
      )}
      <AdminPagination
        base="/admin/service-approvals"
        params={data.filters}
        nextCursor={data.nextCursor}
        previousCursor={data.previousCursor}
      />
    </>
  );
}
