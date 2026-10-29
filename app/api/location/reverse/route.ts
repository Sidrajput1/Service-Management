import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createGeocodingLimiter,
  GeocodingFailure,
  readBoundedJson,
  reverseGeocode,
  validatedGeocodingReading,
} from "@/lib/reverse-geocoding";

export const runtime = "nodejs";
export const maxDuration = 15;

const processState = globalThis as typeof globalThis & {
  servizatoGeocodingLimiter?: ReturnType<typeof createGeocodingLimiter>;
};
const limiter = (processState.servizatoGeocodingLimiter ??=
  createGeocodingLimiter());
const cookieName = "servizato_geocode_client";

function json(value: unknown, status = 200, cookie?: string, secure = false) {
  const response = NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Origin, Cookie",
      "X-Content-Type-Options": "nosniff",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
  if (cookie)
    response.cookies.set(cookieName, cookie, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/api/location/reverse",
      maxAge: 3600,
    });
  return response;
}

export async function POST(request: Request) {
  let client: string | undefined;
  let secure = false;
  try {
    const origin = request.headers.get("origin");
    const target = new URL(request.url);
    secure = target.protocol === "https:";
    const site = request.headers.get("sec-fetch-site");
    // Browser requests only originate in this app. No permissive CORS response.
    if (origin !== target.origin || (site !== null && site !== "same-origin"))
      return json(
        { error: "Open Servizato to request an address suggestion." },
        403,
      );
    if (
      !/^application\/json(?:\s*;|$)/i.test(
        request.headers.get("content-type") || "",
      )
    )
      return json({ error: "Submit a JSON location request." }, 415);
    const length = Number(request.headers.get("content-length") || 0);
    if (!Number.isFinite(length) || length < 0 || length > 1024)
      return json({ error: "The location request is too large." }, 413);
    const body = await readBoundedJson(request.body, 1024);
    const reading = validatedGeocodingReading(body);
    const key = process.env.GOOGLE_MAPS_GEOCODING_API_KEY?.trim();
    //console.log("key is",key);
    if (!key)
      return json(
        {
          error:
            "Address suggestions are not configured. Enter your address manually.",
        },
        503,
      );
    const existing = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)servizato_geocode_client=([a-f0-9-]{36})(?:;|$)/)?.[1];
    client = existing || randomUUID();
    if (!limiter.consume(client))
      return json(
        {
          error:
            "Address suggestions have reached their limit. Try later or enter your address manually.",
        },
        429,
        client,
        secure,
      );
    const address = await reverseGeocode(reading, key);
    return json({ address, attribution: "Google Maps" }, 200, client, secure);
  } catch (error) {
    if (error instanceof GeocodingFailure)
      return json({ error: error.safeMessage }, error.status, client, secure);
    // Never echo upstream URLs, API keys, exact coordinates or raw errors.
    return json(
      {
        error:
          "Address suggestions are unavailable. Enter your address manually.",
      },
      503,
      client,
      secure,
    );
  }
}
