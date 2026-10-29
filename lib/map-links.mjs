import {
  validCoordinates,
  formatServiceAddress,
} from "./service-location-client.mjs";
export function mapDestination(address) {
  return address?.locationConfirmed === true &&
    validCoordinates(address.location?.coordinates)
    ? `${address.location.coordinates[1]},${address.location.coordinates[0]}`
    : formatServiceAddress(address);
}
export function googleMapsLink(address, directions = false) {
  const destination = mapDestination(address);
  if (!destination) return null;
  const url = new URL(
    directions
      ? "https://www.google.com/maps/dir/"
      : "https://www.google.com/maps/search/",
  );
  url.searchParams.set("api", "1");
  url.searchParams.set(directions ? "destination" : "query", destination);
  return url.toString();
}
export function googleMapsEmbed(address, key) {
  const destination = mapDestination(address);
  if (!destination || !key?.trim()) return null;
  const url = new URL("https://www.google.com/maps/embed/v1/place");
  url.searchParams.set("key", key.trim());
  url.searchParams.set("q", destination);
  return url.toString();
}
