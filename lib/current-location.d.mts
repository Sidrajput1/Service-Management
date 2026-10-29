export interface CurrentLocationReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  observedAt: number;
}
export function getCurrentLocation(options?: {
  geolocation?: Pick<Geolocation, "getCurrentPosition">;
  secure?: boolean;
  now?: () => number;
}): Promise<CurrentLocationReading>;
export function mergeSuggestedAddress<T extends Record<string, unknown>>(current: T, suggestion: unknown): T;
export function createAddressLookup(options?: { fetcher?: typeof fetch }): (
  reading: CurrentLocationReading, signal?: AbortSignal,
) => Promise<Partial<Record<"addressLine" | "city" | "state" | "locality" | "pincode", string>>>;
