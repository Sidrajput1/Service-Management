import {
  normalizeKey,
  normalizeText,
  normalizeCityKey,
  normalizeStateKey,
  normalizePincode,
} from "./marketplace-policy.mjs";
import {
  areaFromFilters,
  withoutDiscoveryArea,
} from "./discovery-location.mjs";

export const discoveryFreshnessMs = 30_000;
const defaults = {
  minRating: "0",
  sort: "relevance",
  page: "1",
  limit: "12",
  scope: "local",
};
const fields = [
  "category",
  "city",
  "limit",
  "locality",
  "minRating",
  "page",
  "pincode",
  "provider",
  "providerId",
  "q",
  "scope",
  "serviceId",
  "sort",
  "state",
];
/** Normalize equivalent requests without replacing invalid values with successful defaults.
 * @param {import('./marketplace-types').DiscoveryFilters & {offeringId?: string}} filters
 * @param {boolean} navigation Preserve readable address labels in browser URLs.
 */
function parameters(filters = {}, navigation = false) {
  const params = new URLSearchParams();
  for (const field of fields) {
    const raw = filters[field];
    if (typeof raw !== "string" || !normalizeText(raw)) continue;
    let value = normalizeKey(raw);
    if (field === "pincode") value = normalizePincode(raw);
    else if (
      navigation &&
      ["city", "state", "locality", "q", "provider"].includes(field)
    )
      value = normalizeText(raw);
    else if (field === "city") value = normalizeCityKey(raw);
    else if (field === "state") value = normalizeStateKey(raw);
    else if (["page", "limit", "minRating"].includes(field)) {
      const number = Number(value);
      if (Number.isFinite(number)) value = String(number);
    }
    if (value !== defaults[field]) params.set(field, value);
  }
  // A booking continuation is UI state, never an extra provider-query identity.
  if (navigation && /^[a-f\d]{24}$/iu.test(filters.offeringId || ""))
    params.set("offeringId", filters.offeringId.toLowerCase());
  return params;
}
/** Browser navigation retains readable text, while network/cache identities are canonical. */
export const discoveryParams = (filters) => parameters(filters, true);
export const discoveryQueryIdentity = (filters) =>
  parameters(filters).toString();
export function discoveryAreaIdentity(area) {
  return discoveryQueryIdentity({
    city: area?.city,
    state: area?.state,
    locality: area?.locality,
    pincode: area?.pincode,
  });
}
/** @param {import('./marketplace-types').DiscoveryFilters} filters
 * @param {string} audience
 * @param {(path: string, options: {signal: AbortSignal}) => Promise<import('./marketplace-types').DiscoveryResult>} fetchResult
 * @param {{topRated?: boolean}} options
 */
export function discoveryQueryOptions(
  filters,
  audience,
  fetchResult,
  options = {},
) {
  const search = options.topRated
    ? { ...filters, limit: "6", page: "1", sort: "rating" }
    : filters;
  const params = discoveryQueryIdentity(search);
  const endpoint = options.topRated
    ? "discovery/top-rated"
    : audience === "public"
      ? "discovery"
      : "customer/discovery";
  return {
    queryKey: [
      options.topRated ? "top-rated-providers" : "discovery",
      params,
      audience,
    ],
    queryFn: ({ signal }) => fetchResult(`/${endpoint}?${params}`, { signal }),
    staleTime: discoveryFreshnessMs,
    gcTime: 5 * 60_000,
  };
}

/** @typedef {import('./marketplace-types').DiscoveryFilters & {offeringId?: string}} SearchFilters */
/** @typedef {{urlKey: string|null, areaKey: string, filters: SearchFilters, pendingUrl: string|null, awaitingPreferenceFrom: string|null}} SearchState */
/** @type {SearchState} */
export const initialDiscoverySearchState = Object.freeze({
  urlKey: null,
  areaKey: "",
  filters: {},
  pendingUrl: null,
  awaitingPreferenceFrom: null,
});
const navigationIdentity = (filters) => {
  const params = parameters(filters);
  if (/^[a-f\d]{24}$/iu.test(filters.offeringId || ""))
    params.set("offeringId", filters.offeringId.toLowerCase());
  return params.toString();
};
/** Reconcile one URL navigation or one preference change atomically, without requesting GPS.
 * Explicit URL areas win once on navigation; a later header selection wins over that old URL.
 * @param {SearchState} current
 * @param {SearchFilters} urlFilters
 * @param {Parameters<typeof discoveryAreaIdentity>[0]} preferredArea
 * @param {boolean} ready
 */
export function reconcileDiscoverySearch(
  current,
  urlFilters,
  preferredArea,
  ready,
) {
  const unchanged = { state: current, chooseArea: null, replaceSearch: null };
  if (!ready) return unchanged;
  const urlKey = navigationIdentity(urlFilters),
    areaKey = discoveryAreaIdentity(preferredArea);
  if (current.awaitingPreferenceFrom !== null && urlKey === current.urlKey) {
    if (areaKey === current.areaKey)
      return {
        ...unchanged,
        state: { ...current, awaitingPreferenceFrom: null },
      };
    if (areaKey === current.awaitingPreferenceFrom) return unchanged;
  }
  if (
    current.pendingUrl !== null &&
    urlKey === current.pendingUrl &&
    areaKey === current.areaKey
  )
    return { ...unchanged, state: { ...current, urlKey, pendingUrl: null } };
  if (
    current.pendingUrl !== null &&
    urlKey === current.urlKey &&
    areaKey === current.areaKey
  )
    return unchanged;
  if (current.urlKey !== urlKey && urlKey !== current.pendingUrl) {
    const explicitArea = areaFromFilters(urlFilters),
      area = explicitArea || preferredArea;
    return {
      state: {
        urlKey,
        areaKey: discoveryAreaIdentity(area),
        filters: { ...withoutDiscoveryArea(urlFilters), ...(area || {}) },
        pendingUrl: null,
        awaitingPreferenceFrom:
          explicitArea && discoveryAreaIdentity(explicitArea) !== areaKey
            ? areaKey
            : null,
      },
      chooseArea:
        explicitArea && discoveryAreaIdentity(explicitArea) !== areaKey
          ? explicitArea
          : null,
      replaceSearch: null,
    };
  }
  if (areaKey !== current.areaKey) {
    const filters = {
      ...withoutDiscoveryArea(current.filters),
      ...(preferredArea || {}),
      page: "1",
      scope: "local",
    };
    // A header preference is independent from an explicitly shared search URL.
    // Remove an old URL area, and repair pagination/scope only when necessary.
    // An ordinary /services preference change therefore needs no URL write.
    const urlTarget = {
      ...withoutDiscoveryArea(urlFilters),
      page: "1",
      scope: "local",
    };
    const target = navigationIdentity(urlTarget);
    return {
      state: {
        ...current,
        filters,
        areaKey,
        pendingUrl: target !== urlKey ? target : null,
        awaitingPreferenceFrom: null,
      },
      chooseArea: null,
      replaceSearch:
        target !== urlKey ? discoveryParams(urlTarget).toString() : null,
    };
  }
  return unchanged;
}
/** Synchronous same-page URL repair; never starts a route navigation that could win over a later link click.
 * Next's native History API integration updates useSearchParams for this query-only change.
 * @param {{location: {pathname: string, search: string, hash?: string}, history: {replaceState: (data: unknown, unused: string, url?: string|URL|null) => void}}} browser
 * @param {string} pathname
 * @param {string} expectedSearch
 * @param {string} targetSearch
 */
export function repairDiscoverySearch(
  browser,
  pathname,
  expectedSearch,
  targetSearch,
) {
  if (
    !["/services", "/customer/services"].includes(pathname) ||
    browser.location.pathname !== pathname
  )
    return false;
  const current = Object.fromEntries(
    new URLSearchParams(browser.location.search),
  );
  const expected = Object.fromEntries(new URLSearchParams(expectedSearch));
  if (navigationIdentity(current) !== navigationIdentity(expected))
    return false;
  const target = new URLSearchParams(targetSearch).toString();
  if (
    navigationIdentity(current) ===
    navigationIdentity(Object.fromEntries(new URLSearchParams(target)))
  )
    return false;
  try {
    // Pass null so Next retains its own history metadata and synchronizes search params.
    browser.history.replaceState(
      null,
      "",
      `${pathname}${target ? `?${target}` : ""}${browser.location.hash || ""}`,
    );
    return true;
  } catch {
    return false;
  }
}
/** Stage a user navigation before router/store updates so their intermediate renders cannot fetch an old page/area.
 * @param {SearchState} current
 * @param {SearchFilters} filters
 */
export function stageDiscoverySearch(current, filters) {
  const target = navigationIdentity(filters);
  return {
    ...current,
    filters,
    areaKey: discoveryAreaIdentity(areaFromFilters(filters)),
    pendingUrl: target !== current.urlKey ? target : null,
    awaitingPreferenceFrom: null,
  };
}
