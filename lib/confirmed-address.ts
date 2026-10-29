import { ApiAuthError } from "./auth";
import { addressIdentity } from "./service-location.mjs";
import { destinationCaptureSchema } from "./location-validation";
import type { z } from "zod";
export function captureServiceDestination(
  address: Record<string, unknown>,
  input: z.infer<typeof destinationCaptureSchema> | undefined,
  customerUserId: unknown,
  now = Date.now(),
) {
  if (!input) return address;
  if (
    now - input.observedAt > 600000 ||
    input.observedAt - now > 5000 ||
    input.accuracy > 50
  )
    throw new ApiAuthError(
      "Capture a fresh location with accuracy within 50 metres, then confirm it is this service address.",
      400,
    );
  return {
    ...address,
    location: { type: "Point", coordinates: [input.longitude, input.latitude] },
    locationConfirmation: {
      source: "customer_gps",
      confirmedBy: customerUserId,
      confirmedAt: new Date(now),
      capturedAt: new Date(input.observedAt),
      accuracyMeters: input.accuracy,
      addressIdentity: addressIdentity(address),
    },
  };
}
