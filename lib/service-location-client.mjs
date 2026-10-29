export function validCoordinates(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}
export function formatServiceAddress(address) {
  return [
    address?.addressLine,
    address?.locality,
    address?.city,
    address?.state,
    address?.pincode,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .join(", ");
}
