import type { CurrentLocationReading } from "./current-location.mjs";
export interface AcceptedJourneyUpdate {
  acceptedAt: number;
  accuracyMeters: number;
}
export function watchJourney(options: {
  geolocation: Pick<Geolocation, "watchPosition" | "clearWatch">;
  send(reading: CurrentLocationReading, signal: AbortSignal): Promise<unknown>;
  onState(state: string): void;
  onArrival?(): void;
  onAccepted?(update: AcceptedJourneyUpdate): void;
  intervalMs?: number;
  requestTimeoutMs?: number;
  eligible?: boolean;
  now?: () => number;
}): { stop(): void };
