import Link from "next/link";
import Image from "next/image";
import { readProvider } from "@/lib/admin-data";
import { objectIdSchema } from "@/lib/pagination";
import {
  AdminHeading,
  AdminReadError,
  StatusBadge,
  AuditHistory,
} from "@/components/admin/AdminUi";
import { ReviewDecisionDialog } from "@/components/admin/ReviewDecisionDialog";
import { dateTime } from "@/lib/customer-types";
export default async function ProviderReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let provider;
  try {
    provider = await readProvider(objectIdSchema.parse((await params).id));
  } catch (error) {
    return <AdminReadError error={error} />;
  }
  const actions =
    provider.verificationStatus === "pending"
      ? ["approve", "request_changes", "reject"]
      : provider.verificationStatus === "verified"
        ? provider.status === "suspended" || provider.status === "inactive"
          ? ["restore"]
          : ["suspend"]
        : [];
  return (
    <>
      <Link href="/admin/providers" className="public-text-link mb-5">
        ← Provider verification
      </Link>
      <AdminHeading
        title={provider.companyName}
        description="Business verification controls this provider’s marketplace eligibility. It does not publish any pending offering."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusBadge status={provider.verificationStatus} />
        <StatusBadge status={provider.status} />
        <span className="provider-badge">
          Revision {provider.reviewVersion}
        </span>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <section className="provider-panel">
            <div className="flex items-center gap-5">
              {provider.businessImage?.url && (
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <Image
                    src={provider.businessImage.url}
                    alt={`${provider.companyName} submitted business image`}
                    fill
                    sizes="96px"
                    className="object-contain"
                  />
                </div>
              )}
              <div>
                <h2 className="font-semibold">Submitted business details</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {provider.businessType || "Business type not supplied"}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
              {[
                ["Contact email", provider.email],
                ["Business phone", provider.phone],
                [
                  "Business address",
                  [
                    provider.address?.addressLine,
                    provider.address?.city,
                    provider.address?.state,
                    provider.address?.pincode,
                  ]
                    .filter(Boolean)
                    .join(", "),
                ],
                [
                  "Onboarding completed",
                  provider.onboardingCompletedAt
                    ? dateTime(provider.onboardingCompletedAt)
                    : "Not completed",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-2 break-words leading-7">
                    {value || "Not supplied"}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {provider.description || "No business description supplied."}
            </p>
            <p className="mt-5 rounded-xl bg-muted/50 p-4 text-xs leading-6 text-muted-foreground">
              No identity, license or qualification documents are collected by
              the current onboarding flow. This review covers the submitted
              business information; it does not establish document verification.
            </p>
          </section>
          <section className="provider-panel">
            <h2 className="font-semibold">Configured coverage</h2>
            {provider.areas.length ? (
              <ul className="mt-4 space-y-3">
                {provider.areas.map(
                  (
                    area: import("@/lib/marketplace-types").CoverageArea,
                    index: number,
                  ) => (
                    <li
                      key={area._id || index}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {[area.city, area.state, area.locality, area.pincode]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <StatusBadge
                        status={area.isActive ? "active" : "inactive"}
                      />
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No service areas saved.
              </p>
            )}
          </section>
          <section className="provider-panel">
            <h2 className="font-semibold">Recent provider offerings</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Each offering has its own review. Up to eight recent items are
              shown.
            </p>
            <ul className="mt-5 divide-y divide-border">
              {provider.offerings.map((item) => (
                <li
                  key={item._id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <Link
                    className="text-sm font-semibold hover:text-primary"
                    href={`/admin/service-approvals/${item._id}`}
                  >
                    {item.name}
                  </Link>
                  <StatusBadge status={item.approvalStatus} />
                </li>
              ))}
            </ul>
            <Link
              href={`/admin/service-approvals?providerId=${provider._id}&status=all`}
              className="public-text-link mt-3"
            >
              All offerings from this business
            </Link>
          </section>
        </div>
        <div className="space-y-6">
          <section className="provider-panel">
            <h2 className="font-semibold">Saved onboarding requirements</h2>
            <ul className="my-5 space-y-3">
              {Object.entries(provider.progress).map(([key, done]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span
                    className={
                      done ? "text-secondary-foreground" : "text-primary"
                    }
                  >
                    {done ? "Complete" : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
            {provider.lastReview?.reason && (
              <p className="mb-5 whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-6">
                Previous feedback: {provider.lastReview.reason}
              </p>
            )}
            <ReviewDecisionDialog
              key={`${provider._id}:${provider.reviewVersion}`}
              type="provider"
              id={provider._id}
              version={provider.reviewVersion}
              actions={actions}
            />
            {!actions.length && (
              <p className="text-xs leading-6 text-muted-foreground">
                The provider must address the feedback and resubmit this
                application before a new approval decision.
              </p>
            )}
          </section>
          <AuditHistory rows={provider.history} />
        </div>
      </div>
    </>
  );
}
