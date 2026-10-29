import Link from "next/link";
import { readProviders } from "@/lib/admin-data";
import {
  AdminHeading,
  AdminEmpty,
  AdminPagination,
  AdminReadError,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { dateTime } from "@/lib/customer-types";
export default async function ProviderQueue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let data;
  try {
    const raw = await searchParams;
    data = await readProviders({ status: "pending", ...raw });
  } catch (error) {
    return <AdminReadError error={error} />;
  }
  return (
    <>
      <AdminHeading
        title="Provider verification"
        description="Review the submitted business, its coverage and saved setup. Approving a provider never approves its individual services."
      />
      <form
        method="get"
        className="provider-panel mb-6 grid gap-4 sm:grid-cols-[1fr_200px_auto]"
      >
        <div>
          <label htmlFor="provider-search" className="provider-label">
            Business name
          </label>
          <input
            id="provider-search"
            name="q"
            defaultValue={data.filters.q}
            maxLength={100}
            className="customer-input"
            placeholder="Search submitted businesses"
          />
        </div>
        <div>
          <label htmlFor="provider-filter" className="provider-label">
            Verification status
          </label>
          <select
            id="provider-filter"
            name="status"
            defaultValue={data.filters.status || "all"}
            className="customer-select"
          >
            {[
              "all",
              "pending",
              "changes_requested",
              "verified",
              "rejected",
              "suspended",
            ].map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="public-button public-button-primary self-end"
        >
          Apply filters
        </button>
        <label className="flex min-h-10 items-center gap-3 text-xs text-muted-foreground">
          <input
            name="includeDrafts"
            type="checkbox"
            value="true"
            defaultChecked={data.filters.includeDrafts === "true"}
          />
          Include incomplete onboarding
        </label>
        <Link href="/admin/providers" className="public-text-link">
          Reset filters
        </Link>
      </form>
      {!data.items.length ? (
        <AdminEmpty />
      ) : (
        <div className="space-y-3">
          {data.items.map((provider) => (
            <article
              key={provider._id}
              className="provider-panel flex flex-wrap items-center justify-between gap-5"
            >
              <div>
                <h2 className="font-semibold">
                  <Link
                    href={`/admin/providers/${provider._id}`}
                    className="hover:text-primary"
                  >
                    {provider.companyName}
                  </Link>
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {provider.businessType || "Business type missing"} ·{" "}
                  {provider.email}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {provider.onboardingCompletedAt
                    ? `Onboarding completed ${dateTime(provider.onboardingCompletedAt)}`
                    : "Onboarding incomplete"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={provider.verificationStatus} />
                  <StatusBadge status={provider.status} />
                </div>
              </div>
              <Link
                href={`/admin/providers/${provider._id}`}
                className="public-button public-button-outline"
              >
                Review business
              </Link>
            </article>
          ))}
        </div>
      )}
      <AdminPagination
        base="/admin/providers"
        params={data.filters}
        nextCursor={data.nextCursor}
        previousCursor={data.previousCursor}
      />
    </>
  );
}
