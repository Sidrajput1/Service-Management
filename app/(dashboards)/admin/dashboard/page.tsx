import Link from "next/link";
import { readAdminOverview } from "@/lib/admin-data";
import {
  AdminHeading,
  AdminReadError,
  AdminEmpty,
  StatusBadge,
} from "@/components/admin/AdminUi";
export default async function AdminDashboard() {
  let data;
  try {
    data = await readAdminOverview();
  } catch (error) {
    return <AdminReadError error={error} />;
  }
  const metrics = [
    [
      "Pending providers",
      data.metrics.pendingProviders,
      "/admin/providers?status=pending",
    ],
    [
      "Changes requested",
      data.metrics.changesRequested,
      "/admin/providers?status=changes_requested",
    ],
    [
      "Pending offerings",
      data.metrics.pendingOfferings,
      "/admin/service-approvals?status=pending",
    ],
    [
      "Approved, active providers",
      data.metrics.approvedActiveProviders,
      "/admin/providers?status=verified",
    ],
    [
      "Active catalog services",
      data.metrics.activeCatalogServices,
      "/admin/pricemaster?status=active",
    ],
  ] as const;
  return (
    <>
      <AdminHeading
        title="Review & operations"
        description="Provider verification and service approval are independent. Both must pass before a service can be booked."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, count, href]) => (
          <Link
            key={label}
            href={href}
            className="provider-panel block transition-colors hover:border-primary"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{count}</p>
            <p className="mt-4 text-xs text-primary">Open queue →</p>
          </Link>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="provider-panel">
          <h2 className="text-lg font-semibold">Business applications</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Recent completed applications awaiting review
          </p>
          <div className="mt-5 divide-y divide-border">
            {data.providers.length ? (
              data.providers.map((row) => (
                <Link
                  key={row._id}
                  href={`/admin/providers/${row._id}`}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <span className="min-w-0 truncate font-medium">
                    {row.companyName}
                  </span>
                  <StatusBadge status={row.verificationStatus} />
                </Link>
              ))
            ) : (
              <AdminEmpty description="No submitted applications are pending." />
            )}
          </div>
          <Link
            className="public-text-link mt-4 inline-block"
            href="/admin/providers"
          >
            Provider verification →
          </Link>
        </section>
        <section className="provider-panel">
          <h2 className="text-lg font-semibold">
            Individual service offerings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Approval here does not verify the business.
          </p>
          <div className="mt-5 divide-y divide-border">
            {data.offerings.length ? (
              data.offerings.map((row) => (
                <Link
                  key={row._id}
                  href={`/admin/service-approvals/${row._id}`}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {row.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.providerName}
                    </span>
                  </span>
                  <StatusBadge status={row.approvalStatus} />
                </Link>
              ))
            ) : (
              <AdminEmpty description="No service offerings are pending." />
            )}
          </div>
          <Link
            className="public-text-link mt-4 inline-block"
            href="/admin/service-approvals"
          >
            Service approvals →
          </Link>
        </section>
      </div>
    </>
  );
}
