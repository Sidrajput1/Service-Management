import type { CurrentLocationReading } from "./current-location.mjs";
export interface DiscoveryArea {
  city: string;
  state: string;
  locality: string;
  pincode: string;
}
export type DiscoverySource = "manual" | "current";
export interface DiscoverySnapshot {
  ready: boolean;
  area: DiscoveryArea | null;
  dismissed: boolean;
  pending: boolean;
  error: string;
  permissionDenied: boolean;
  storageAvailable: boolean;
  scope: string | null;
  source?: DiscoverySource;
  updatedAt?: number;
}
export interface DiscoveryStore {
  getSnapshot(): DiscoverySnapshot;
  subscribe(listener: () => void): () => void;
  choose(area: unknown, source?: DiscoverySource): boolean;
  dismiss(): void;
  clear(): void;
  captureCurrent(): Promise<DiscoveryArea | null>;
  cancelCapture(): void;
  setCaptureScope(scope: string | null): void;
}
export const discoveryStorageKey: string;
export const emptyDiscoverySnapshot: DiscoverySnapshot;
export function discoveryArea(value: unknown): DiscoveryArea | null;
export function discoveryAreaLabel(area: Partial<DiscoveryArea> | null): string;
export function areaFromFilters(
  filters: Partial<DiscoveryArea>,
): DiscoveryArea | null;
export function withoutDiscoveryArea<T extends object>(
  filters: T,
): Omit<T, keyof DiscoveryArea>;
export function discoveryStorageKeyForScope(
  scope: string | null,
): string | null;
export function createDiscoveryLocationStore(
  storage?: Pick<Storage, "getItem" | "setItem">,
  events?: Pick<Window, "addEventListener" | "removeEventListener">,
  options?: {
    scope?: string | null;
    now?: () => number;
    lookupTimeoutMs?: number;
    fetcher?: typeof fetch;
    getCurrentLocation?: () => Promise<CurrentLocationReading>;
    lookup?: (
      reading: CurrentLocationReading,
      signal?: AbortSignal,
    ) => Promise<unknown>;
    createLookup?: () => (
      reading: CurrentLocationReading,
      signal?: AbortSignal,
    ) => Promise<unknown>;
  },
): DiscoveryStore;
