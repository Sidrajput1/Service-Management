import { createHash } from "node:crypto";
import { addressIdentity } from "./service-location.mjs";
import { assessCoverage, legacyCoverage } from "./marketplace-policy.mjs";

export function destinationIdentity(
  address: Parameters<typeof addressIdentity>[0],
) {
  const evidence = address?.locationConfirmation;
  // Bind both editable text and the optional private point/evidence snapshot.
  // These fields are loaded explicitly only by the server at confirmation/acceptance.
  const stamp = (value: unknown) => {
    if (value == null) return null;
    const time =
      value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(time) ? new Date(time).toISOString() : "invalid";
  };
  return createHash("sha256")
    .update(
      JSON.stringify({
        address: addressIdentity(address),
        coordinates: address?.location?.coordinates
          ? Array.from(address.location.coordinates)
          : null,
        evidence: evidence
          ? {
              source: evidence.source,
              confirmedBy: String(evidence.confirmedBy),
              confirmedAt: stamp(evidence.confirmedAt),
              capturedAt: stamp(evidence.capturedAt),
              accuracyMeters: evidence.accuracyMeters,
              addressIdentity: evidence.addressIdentity,
            }
          : null,
      }),
    )
    .digest("hex");
}
export function coverageForRequest(
  provider: Parameters<typeof legacyCoverage>[0],
  address: Parameters<typeof addressIdentity>[0],
  now = new Date(),
) {
  return {
    ...assessCoverage(legacyCoverage(provider), address),
    assessedAt: now,
    addressIdentity: destinationIdentity(address),
  };
}
export function coverageReviewToken(request: {
  _id: unknown;
  address: Parameters<typeof addressIdentity>[0];
  coverage?: { addressIdentity?: string };
  updatedAt?: Date;
}) {
  const snapshotIdentity =
    request.coverage?.addressIdentity ||
    createHash("sha256").update(addressIdentity(request.address)).digest("hex");
  return createHash("sha256")
    .update(
      `${String(request._id)}|${snapshotIdentity}|${request.updatedAt ? new Date(request.updatedAt).toISOString() : "legacy"}`,
    )
    .digest("hex");
}
/** Idempotency binds the customer's exact submitted intent, never a mutable listing price. */
export function requestIntentHash(body: unknown) {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}
