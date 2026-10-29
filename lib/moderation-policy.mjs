import { normalizeKey, normalizeText } from "./marketplace-policy.mjs";

export const providerVerificationStatuses = [
  "pending",
  "changes_requested",
  "verified",
  "rejected",
];
export const offeringApprovalStatuses = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
];
export const publishedOfferingFilter = {
  isActive: true,
  approvalStatus: "approved",
};
export const providerReviewActions = [
  "approve",
  "request_changes",
  "reject",
  "suspend",
  "restore",
];
export const offeringReviewActions = ["approve", "request_changes", "reject"];
export function revisionOf(record) {
  return Number.isInteger(record?.reviewVersion) ? record.reviewVersion : 0;
}
export function revisionFilter(version, field = "reviewVersion") {
  return version === 0
    ? { $or: [{ [field]: 0 }, { [field]: { $exists: false } }] }
    : { [field]: version };
}
export function providerTransition(current, action) {
  const verification = current.verificationStatus || "pending",
    status = current.status || "active";
  if (
    action === "suspend" &&
    verification === "verified" &&
    status !== "suspended"
  )
    return { verificationStatus: verification, status: "suspended" };
  if (
    action === "restore" &&
    verification === "verified" &&
    status !== "active"
  )
    return { verificationStatus: verification, status: "active" };
  if (verification !== "pending") return null;
  if (action === "approve") return { verificationStatus: "verified", status };
  if (action === "request_changes")
    return { verificationStatus: "changes_requested", status };
  if (action === "reject") return { verificationStatus: "rejected", status };
  return null;
}
export function offeringTransition(current, action) {
  const status = current.approvalStatus || "pending";
  // An approved listing can be withdrawn after a new concern; resubmission is always separate.
  if (!["pending", "approved"].includes(status)) return null;
  if (action === "approve" && status === "pending")
    return { approvalStatus: "approved" };
  if (action === "request_changes")
    return { approvalStatus: "changes_requested" };
  if (action === "reject") return { approvalStatus: "rejected" };
  return null;
}
export function reasonRequired(action) {
  return ["request_changes", "reject", "suspend"].includes(action);
}
export function offeringScopeChanged(current, next) {
  return (
    normalizeText(current.description) !== normalizeText(next.description) ||
    (current.unit || "job") !== (next.unit || "job") ||
    (current.pricingModel || "fixed") !== (next.pricingModel || "fixed") ||
    normalizeText(current.offerName) !== normalizeText(next.offerName)
  );
}
export function providerIdentityChanged(current, next) {
  return (
    ["companyName", "businessType", "description"].some(
      (key) =>
        normalizeText(current[key]) !==
        normalizeText(next[key] ?? current[key]),
    ) ||
    Boolean(
      next.address &&
        ["addressLine", "city", "state", "pincode"].some(
          (key) =>
            normalizeText(current.address?.[key]) !==
            normalizeText(next.address[key] ?? current.address?.[key]),
        ),
    )
  );
}
export function catalogNameKey(name) {
  return normalizeKey(name);
}
export function catalogNamePattern(name) {
  return `^\\s*${normalizeText(name)
    .split(" ")
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+")}\\s*$`;
}
export function offeringEligibility(
  offering,
  provider,
  item,
  address,
  activeCategoryKeys,
) {
  if (
    !provider ||
    provider.status !== "active" ||
    provider.verificationStatus !== "verified" ||
    !provider.onboardingCompletedAt
  )
    return "This business is not approved and active for new bookings.";
  if (!offering || !offering.isActive || offering.approvalStatus !== "approved")
    return "This service offering is awaiting approval or is no longer published.";
  if (
    !item ||
    !item.isActive ||
    item.itemType !== "service" ||
    (item.categoryKey &&
      item.categoryKey !== "other" &&
      !activeCategoryKeys.includes(item.categoryKey))
  )
    return "This catalog service is inactive.";
  // Coverage is assessed separately: a mismatch requires provider confirmation,
  // while these approval/catalog gates always block an ineligible request.
  return null;
}
