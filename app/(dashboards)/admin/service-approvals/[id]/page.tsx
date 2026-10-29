import Link from "next/link";
import { readOffering } from "@/lib/admin-data";
import { objectIdSchema } from "@/lib/pagination";
import {
  AdminHeading,
  AdminReadError,
  StatusBadge,
  AuditHistory,
} from "@/components/admin/AdminUi";
import { ReviewDecisionDialog } from "@/components/admin/ReviewDecisionDialog";
import { money } from "@/lib/customer-types";
export default async function OfferingReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let offering;
  try {
    offering = await readOffering(objectIdSchema.parse((await params).id));
  } catch (error) {
    return <AdminReadError error={error} />;
  }
  const actions =
    offering.approvalStatus === "pending"
      ? ["approve", "request_changes", "reject"]
      : offering.approvalStatus === "approved"
        ? ["request_changes", "reject"]
        : [];
  return (
    <>
      <Link href="/admin/service-approvals" className="public-text-link mb-5">
        ← Service approvals
      </Link>
      <AdminHeading
        title={offering.name}
        description="Review this provider’s service scope and publishing eligibility. Providers set their own local prices; suggested catalog pricing is a reference."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <section className="provider-panel">
            <p className="provider-label">This offering</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={offering.approvalStatus} />
              <StatusBadge status={offering.isActive ? "active" : "inactive"} />
            </div>
            <h2 className="mt-6 font-semibold">{offering.providerName}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">
                Business verification:
              </span>
              <StatusBadge status={offering.providerVerificationStatus} />
              <StatusBadge status={offering.providerStatus} />
            </div>
            <Link
              href={`/admin/providers/${offering.providerId}`}
              className="public-text-link mt-3"
            >
              Review business separately
            </Link>
            <p className="mt-5 rounded-xl bg-secondary/40 p-4 text-xs leading-6 text-secondary-foreground">
              Approving this offering does not approve or activate its provider.
              Both decisions, the active catalog and matching service areas must
              allow a booking.
            </p>
            <h3 className="mt-6 text-sm font-semibold">
              Provider’s service scope
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {offering.description ||
                "No custom description supplied; review the linked catalog scope below."}
            </p>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                [
                  "Provider price",
                  offering.pricingModel === "quote_required"
                    ? "Quote required; not payable online"
                    : money(offering.price),
                ],
                [
                  "Pricing basis",
                  `${offering.pricingModel.replaceAll("_", " ")} / ${offering.unit.replaceAll("_", " ")}`,
                ],
                ["Currency", offering.currency],
                ["Tax", `${offering.taxPercent}%`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-2 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {offering.offerEnabled && (
              <p className="mt-5 text-sm leading-7">
                Promotion: {offering.offerName || "Unnamed promotion"} ·{" "}
                {offering.discountValue} {offering.discountType}
              </p>
            )}
          </section>
          <section className="provider-panel">
            <h2 className="font-semibold">Central catalog reference</h2>
            <p className="mt-3 text-sm">{offering.catalogName}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {offering.catalogDescription ||
                "No catalog description supplied."}
            </p>
            <div className="mt-4 flex gap-2">
              <StatusBadge
                status={offering.catalogActive ? "active" : "inactive"}
              />
              <span className="provider-badge">
                {offering.categoryKey || "Other services"}
              </span>
            </div>
            <Link
              href={`/admin/pricemaster?q=${encodeURIComponent(offering.catalogName)}`}
              className="public-text-link mt-3"
            >
              View catalog entry
            </Link>
          </section>
        </div>
        <div className="space-y-6">
          <section className="provider-panel">
            <h2 className="font-semibold">Offering decision</h2>
            <p className="my-4 text-xs leading-6 text-muted-foreground">
              Price-only adjustments retain approval. Changed descriptions,
              pricing basis or promotional claims require a new review.
              Historical amounts remain saved.
            </p>
            {offering.lastReview?.reason && (
              <p className="mb-5 whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-6">
                Previous feedback: {offering.lastReview.reason}
              </p>
            )}
            <ReviewDecisionDialog
              key={`${offering._id}:${offering.reviewVersion}`}
              type="offering"
              id={offering._id}
              version={offering.reviewVersion}
              actions={actions}
            />
            {!actions.length && (
              <p className="text-xs leading-6 text-muted-foreground">
                The provider must address the feedback and resubmit this
                offering.
              </p>
            )}
          </section>
          <AuditHistory rows={offering.history} />
        </div>
      </div>
    </>
  );
}
