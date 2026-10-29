import "server-only";
import { gpsReadingSchema } from "@/lib/location-validation";

export type AddressSuggestion = Partial<{
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
}>;

export class GeocodingFailure extends Error {
  constructor(
    public readonly status: number,
    public readonly safeMessage: string,
  ) {
    super(safeMessage);
  }
}

export function validatedGeocodingReading(value: unknown, now = Date.now()) {
  const parsed = gpsReadingSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.accuracy > 1000 ||
    parsed.data.observedAt < now - 120_000 ||
    parsed.data.observedAt > now + 5000
  ) {
    throw new GeocodingFailure(
      400,
      "Capture a fresh, accurate current location or enter your address manually.",
    );
  }
  return parsed.data;
}

// Do not retain raw provider responses, geometry, place IDs or formatted addresses.
export function addressSuggestion(value: unknown): AddressSuggestion | null {
  if (!value || typeof value !== "object") return null;
  const data = value as { status?: unknown; results?: unknown };
  if (data.status !== "OK" || !Array.isArray(data.results)) return null;
  for (const result of data.results.slice(0, 10)) {
    if (!result || typeof result !== "object") continue;
    const components = (result as { address_components?: unknown })
      .address_components;
    if (!Array.isArray(components)) continue;
    const fields = new Map<string, string>();
    for (const component of components.slice(0, 40)) {
      if (!component || typeof component !== "object") continue;
      const { long_name: name, types } = component as {
        long_name?: unknown;
        types?: unknown;
      };
      if (typeof name !== "string" || !Array.isArray(types)) continue;
      const cleaned = name.normalize("NFKC").replace(/\s+/g, " ").trim();
      if (!cleaned || cleaned.length > 150 || /[\u0000-\u001f]/.test(cleaned))
        continue;
      for (const type of types.slice(0, 10)) {
        if (typeof type === "string" && !fields.has(type))
          fields.set(type, cleaned);
      }
    }
    const address: AddressSuggestion = {};
    const street = [fields.get("street_number"), fields.get("route")]
      .filter(Boolean)
      .join(" ");
    const line = [fields.get("premise"), street].filter(Boolean).join(", ");
    if (line && line.length <= 300) address.addressLine = line;
    const locality =
      fields.get("sublocality_level_1") ||
      fields.get("sublocality") ||
      fields.get("neighborhood");
    if (locality && locality.length <= 100) address.locality = locality;
    // A district/admin area is not necessarily the city; never guess this field.
    const city = fields.get("locality") || fields.get("postal_town");
    if (city && city.length <= 100) address.city = city;
    const state = fields.get("administrative_area_level_1");
    if (state && state.length <= 100) address.state = state;
    const pincode = fields.get("postal_code");
    if (pincode && /^[1-9]\d{5}$/.test(pincode)) address.pincode = pincode;
    if (Object.keys(address).length) return address;
  }
  return null;
}

export async function readBoundedJson(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
) {
  if (!body)
    throw new GeocodingFailure(400, "Submit a valid location request.");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        throw new GeocodingFailure(413, "The location response is too large.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new GeocodingFailure(400, "Submit a valid location request.");
    }
  } finally {
    // Cancel oversized/failed streams too, without logging provider payloads.
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Supplemental single-process budgets; the Cloud project quota is the hard cap. */
export function createGeocodingLimiter() {
  let minute = -1;
  let minuteCount = 0;
  let day = -1;
  let dayCount = 0;
  const clients = new Map<
    string,
    { minute: number; count: number; seen: number }
  >();
  return {
    consume(client: string, now = Date.now()) {
      const currentMinute = Math.floor(now / 60_000);
      const currentDay = Math.floor(now / 86_400_000);
      if (currentMinute !== minute) {
        minute = currentMinute;
        minuteCount = 0;
      }
      if (currentDay !== day) {
        day = currentDay;
        dayCount = 0;
      }
      for (const [key, entry] of clients) {
        if (now - entry.seen > 3_600_000) clients.delete(key);
      }
      const previous = clients.get(client);
      if (
        minuteCount >= 30 ||
        dayCount >= 500 ||
        (!previous && clients.size >= 1000) ||
        (previous?.minute === currentMinute && previous.count >= 5)
      )
        return false;
      clients.set(client, {
        minute: currentMinute,
        count: previous?.minute === currentMinute ? previous.count + 1 : 1,
        seen: now,
      });
      minuteCount++;
      dayCount++;
      return true;
    },
  };
}

// export async function reverseGeocode(
//   reading: ReturnType<typeof validatedGeocodingReading>,
//   key: string,
//   fetcher: typeof fetch = fetch,
//   timeoutMs = 8000,
// ) {
//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), timeoutMs);
//   try {
//     const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
//     url.searchParams.set("latlng", `${reading.latitude},${reading.longitude}`);
//     url.searchParams.set("key", key);
//     url.searchParams.set("language", "en");
//     const response = await fetcher(url, {
//       cache: "no-store",
//       redirect: "error",
//       signal: controller.signal,
//       headers: { Accept: "application/json" },
//     });
//     if (!response.ok) throw new Error("Geocoding unavailable");
//     const value = await readBoundedJson(response.body, 131_072);
//     const suggestion = addressSuggestion(value);
//     if (!suggestion) {
//       const status = (value as { status?: unknown } | null)?.status;
//       if (status === "ZERO_RESULTS" || status === "OK")
//         throw new GeocodingFailure(
//           422,
//           "No address suggestion was found. Enter your address manually.",
//         );
//       throw new Error("Geocoding unavailable");
//     }
//     return suggestion;
//   } catch (error) {
//     if (error instanceof GeocodingFailure && error.status === 422) throw error;
//     throw new GeocodingFailure(
//       503,
//       "Address suggestions are unavailable. Enter your address manually.",
//     );
//   } finally {
//     clearTimeout(timeout);
//   }
// }

export async function reverseGeocode(
  reading: ReturnType<typeof validatedGeocodingReading>,
  key: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 8000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");

    url.searchParams.set("latlng", `${reading.latitude},${reading.longitude}`);
    url.searchParams.set("key", key);
    url.searchParams.set("language", "en");

    const response = await fetcher(url, {
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const value = await readBoundedJson(response.body, 131_072);

    const data = value as {
      status?: unknown;
      error_message?: unknown;
    } | null;

    // Safe debugging: no key, URLs or coordinates.
    console.log("[Geocoding Debug]", {
      httpStatus: response.status,
      googleStatus: data?.status,
    });

    if (!response.ok || data?.status !== "OK") {
      if (data?.status === "ZERO_RESULTS") {
        throw new GeocodingFailure(
          422,
          "No address found. Enter your address manually.",
        );
      }

      throw new Error(
        `Google Geocoding failed: ${String(data?.status ?? response.status)}`,
      );
    }

    const suggestion = addressSuggestion(value);

    if (!suggestion) {
      throw new GeocodingFailure(422, "No address suggestion was found.");
    }

    return suggestion;
  } catch (error) {
    if (error instanceof GeocodingFailure && error.status === 422) {
      throw error;
    }

    // Do not print the raw error: it may contain
    // a provider URL or other sensitive details.
    console.error("[Geocoding Debug] Request failed");

    throw new GeocodingFailure(
      503,
      "Address suggestions are unavailable. Enter your address manually.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
