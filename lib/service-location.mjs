import { createHash } from "node:crypto";
import { validCoordinates } from "./service-location-client.mjs";
export {
  validCoordinates,
  formatServiceAddress,
} from "./service-location-client.mjs";
export function addressIdentity(address) {
  return [
    address?.addressLine,
    address?.locality,
    address?.city,
    address?.state,
    address?.pincode,
  ]
    .map((value) =>
      String(value || "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase(),
    )
    .join("|");
}
export function confirmedDestination(address) {
  const confirmation = address?.locationConfirmation,
    coordinates = address?.location?.coordinates;
  if (
    !validCoordinates(coordinates) ||
    !confirmation ||
    confirmation.source !== "customer_gps" ||
    !confirmation.confirmedBy ||
    !Number.isFinite(new Date(confirmation.confirmedAt).getTime()) ||
    confirmation.addressIdentity !== addressIdentity(address) ||
    !Number.isFinite(confirmation.accuracyMeters) ||
    confirmation.accuracyMeters <= 0 ||
    confirmation.accuracyMeters > 50
  )
    return null;
  return { latitude: coordinates[1], longitude: coordinates[0] };
}
/** @returns {import("./customer-types").Address | undefined} */
export function serviceAddressForViewer(address, includeCoordinates = false) {
  if (!address) return undefined;
  /** @type {import("./customer-types").Address} */ const result = {};
  for (const key of [
    "label",
    "addressLine",
    "locality",
    "city",
    "state",
    "pincode",
  ])
    if (typeof address[key] === "string") result[key] = address[key];
  const destination = includeCoordinates ? confirmedDestination(address) : null;
  if (destination) {
    result.location = {
      type: "Point",
      coordinates: [destination.longitude, destination.latitude],
    };
    result.locationConfirmed = true;
  }
  return result;
}
/** Scrubs snapshots from legacy lean/populated/aggregate responses; no Date/ObjectId conversion. */
export function stripServiceLocations(value) {
  if (Array.isArray(value)) {
    for (const item of value) stripServiceLocations(item);
    return value;
  }
  if (!value || typeof value !== "object" || value.constructor !== Object)
    return value;
  if (value.address && typeof value.address === "object") {
    delete value.address.location;
    delete value.address.locationConfirmation;
    delete value.address.locationConfirmed;
  }
  if (Array.isArray(value.addresses))
    for (const address of value.addresses) {
      if (!address || typeof address !== "object") continue;
      delete address.location;
      delete address.locationConfirmation;
      delete address.locationConfirmed;
    }
  delete value.arrivalTracking;
  delete value.arrivalNotification;
  for (const item of Object.values(value)) stripServiceLocations(item);
  return value;
}
export function destinationKey(address) {
  const point = confirmedDestination(address);
  return point
    ? createHash("sha256")
        .update(
          `${point.longitude},${point.latitude}|${new Date(address.locationConfirmation.confirmedAt).toISOString()}`,
        )
        .digest("hex")
    : null;
}
