import { getCurrentLocation } from "./current-location.mjs";

/** Structured discovery preferences only: never booking addresses or device points. */
export const discoveryStorageKey = "servizato.discovery-location.v1";
const neutral = {
  ready: false,
  area: null,
  dismissed: false,
  pending: false,
  error: "",
  permissionDenied: false,
  storageAvailable: false,
  scope: null,
};
export const emptyDiscoverySnapshot = Object.freeze(neutral);
const forbidden =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;
const fields = { city: 80, state: 80, locality: 100, pincode: 20 };
function clean(value, max) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > max || forbidden.test(value))
    return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  return normalized.length <= max ? normalized : null;
}
export function discoveryArea(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const area = {};
  for (const [field, max] of Object.entries(fields)) {
    const text = clean(value[field], max);
    if (text === null) return null;
    area[field] = field === "pincode" ? text.replace(/\s/gu, "") : text;
  }
  if (
    (area.pincode && !/^[1-9]\d{5}$/u.test(area.pincode)) ||
    (!area.city && !area.locality && !area.pincode)
  )
    return null;
  return area;
}
export function discoveryAreaLabel(area) {
  return area
    ? [area.locality, area.city, area.state, area.pincode]
        .filter(Boolean)
        .join(" · ")
    : "Choose your area";
}
export function areaFromFilters(filters) {
  return discoveryArea({
    city: filters.city,
    state: filters.state,
    locality: filters.locality,
    pincode: filters.pincode,
  });
}
export function withoutDiscoveryArea(filters) {
  const copy = { ...filters };
  for (const field of Object.keys(fields)) delete copy[field];
  return copy;
}
function validScope(scope) {
  return (
    typeof scope === "string" &&
    /^(?:anonymous|(?:customer|user):[A-Za-z0-9_-]{1,128})$/u.test(scope)
  );
}
export function discoveryStorageKeyForScope(scope) {
  return scope === "anonymous"
    ? discoveryStorageKey
    : validScope(scope)
      ? `${discoveryStorageKey}.${encodeURIComponent(scope)}`
      : null;
}
function savedPreference(raw, scope) {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      value.version !== 1
    )
      return null;
    if (
      Object.keys(value).some(
        (key) =>
          ![
            "version",
            "area",
            "dismissed",
            "source",
            "updatedAt",
            "ownerScope",
          ].includes(key),
      )
    )
      return null;
    if (value.dismissed !== undefined && typeof value.dismissed !== "boolean")
      return null;
    if (
      value.source !== undefined &&
      !["manual", "current"].includes(value.source)
    )
      return null;
    if (
      value.updatedAt !== undefined &&
      (!Number.isSafeInteger(value.updatedAt) || value.updatedAt <= 0)
    )
      return null;
    if (value.ownerScope !== undefined && !validScope(value.ownerScope))
      return null;
    if (value.source === "current" && value.ownerScope !== scope) return null;
    let area = null;
    if (value.area !== undefined && value.area !== null) {
      if (Object.keys(value.area).some((key) => !Object.hasOwn(fields, key)))
        return null;
      area = discoveryArea(value.area);
      if (!area) return null;
    }
    if (
      !area &&
      (value.source !== undefined ||
        value.updatedAt !== undefined ||
        value.ownerScope !== undefined)
    )
      return null;
    return {
      area,
      dismissed: value.dismissed === true,
      ...(area
        ? {
            ...(value.source === undefined ? {} : { source: value.source }),
            ...(value.updatedAt === undefined
              ? {}
              : { updatedAt: value.updatedAt }),
          }
        : {}),
    };
  } catch {
    return null;
  }
}
function freezeSnapshot(value) {
  return Object.freeze({
    ...value,
    area: value.area ? Object.freeze({ ...value.area }) : null,
  });
}
function safeReading(value, now) {
  if (!value || typeof value !== "object") return null;
  const { latitude, longitude, accuracy, observedAt } = value;
  if (
    ![latitude, longitude, accuracy, observedAt].every(Number.isFinite) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    accuracy <= 0 ||
    accuracy > 100000 ||
    !Number.isSafeInteger(observedAt) ||
    observedAt <= 0 ||
    now - observedAt > 600000 ||
    observedAt - now > 5000
  )
    return null;
  return { latitude, longitude, accuracy, observedAt };
}
function createDiscoveryAreaLookup(fetcher = globalThis.fetch) {
  let cachedKey, cachedArea;
  return async (reading, signal) => {
    if (signal.aborted) throw new Error("Lookup cancelled");
    const key = `${reading.latitude}|${reading.longitude}`;
    if (cachedKey === key) return { ...cachedArea };
    const response = await fetcher("/api/location/reverse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reading),
      signal,
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || signal.aborted) throw new Error("Lookup unavailable");
    const area = discoveryArea(result?.address);
    if (!area) throw new Error("No usable discovery area");
    cachedKey = key;
    cachedArea = area;
    return { ...area };
  };
}

/** One browser store shared by controls. Dependencies are injectable; restoration is offline. */
export function createDiscoveryLocationStore(storage, events, options = {}) {
  const now = options.now || (() => Date.now());
  const locate = options.getCurrentLocation || getCurrentLocation;
  const createLookup =
    options.createLookup ||
    (() => options.lookup || createDiscoveryAreaLookup(options.fetcher));
  const lookupTimeoutMs =
    Number.isFinite(options.lookupTimeoutMs) && options.lookupTimeoutMs > 0
      ? Math.min(options.lookupTimeoutMs, 15000)
      : 15000;
  let lookup = createLookup();
  let scope =
    options.scope === undefined
      ? "anonymous"
      : validScope(options.scope)
        ? options.scope
        : null;
  let initialized = false,
    generation = 0,
    operation = null;
  let snapshot =
    scope === null
      ? emptyDiscoverySnapshot
      : freezeSnapshot({ ...neutral, ready: true, scope });
  const listeners = new Set(),
    memories = new Map(),
    unsaved = new Set();
  function emit() {
    for (const listener of listeners) listener();
  }
  function replace(value) {
    snapshot = freezeSnapshot(value);
    if (scope) memories.set(scope, snapshot);
  }
  function restore() {
    initialized = true;
    if (!scope) {
      snapshot = emptyDiscoverySnapshot;
      return snapshot;
    }
    if (unsaved.has(scope)) {
      replace({ ...(memories.get(scope) || snapshot), pending: false });
      return snapshot;
    }
    const base = { ...neutral, ready: true, scope };
    if (!storage) {
      replace({
        ...(memories.get(scope) || base),
        pending: false,
        storageAvailable: false,
      });
      return snapshot;
    }
    try {
      const key = discoveryStorageKeyForScope(scope);
      const raw = storage.getItem(key);
      let saved = raw ? savedPreference(raw, scope) : null;
      if (!raw && scope !== "anonymous") {
        const legacy = storage.getItem(discoveryStorageKey);
        const candidate = legacy ? savedPreference(legacy, scope) : null;
        // A browser's existing manual choice may be reused, but Google-derived choices are owner-specific.
        if (candidate?.source === "manual") saved = candidate;
      }
      replace({ ...base, ...(saved || {}), storageAvailable: true });
    } catch {
      replace({
        ...(memories.get(scope) || base),
        pending: false,
        storageAvailable: false,
      });
    }
    return snapshot;
  }
  function read() {
    return initialized ? snapshot : restore();
  }
  function persist() {
    if (!scope) return;
    const value = {
      version: 1,
      area: snapshot.area,
      dismissed: snapshot.dismissed,
      ...(snapshot.area
        ? {
            ...(snapshot.source === undefined
              ? {}
              : { source: snapshot.source }),
            ...(snapshot.updatedAt === undefined
              ? {}
              : { updatedAt: snapshot.updatedAt }),
            ...(snapshot.source === "current" ? { ownerScope: scope } : {}),
          }
        : {}),
    };
    try {
      if (!storage) throw new Error("Storage unavailable");
      storage.setItem(
        discoveryStorageKeyForScope(scope),
        JSON.stringify(value),
      );
      unsaved.delete(scope);
      replace({ ...snapshot, storageAvailable: true });
    } catch {
      unsaved.add(scope);
      replace({ ...snapshot, storageAvailable: false });
    }
  }
  function invalidateCapture() {
    generation++;
    if (!operation) return false;
    const previous = operation;
    operation = null;
    previous.controller.abort();
    previous.resolve(null);
    return true;
  }
  function commit(area, source) {
    const updatedAt = Math.max(1, Math.trunc(now()));
    replace({
      ...neutral,
      ready: true,
      scope,
      area,
      dismissed: true,
      source,
      updatedAt,
      storageAvailable: snapshot.storageAvailable,
    });
    persist();
    emit();
  }
  function choose(value, source = "manual") {
    read();
    const area = discoveryArea(value);
    if (!scope || !area || !["manual", "current"].includes(source))
      return false;
    invalidateCapture();
    commit(area, source);
    return true;
  }
  function cancelCapture() {
    read();
    if (!invalidateCapture()) return;
    replace({ ...snapshot, pending: false });
    emit();
  }
  function captureCurrent() {
    read();
    if (!scope) return Promise.resolve(null);
    if (operation) return operation.promise;
    const id = ++generation,
      controller = new AbortController();
    let resolve;
    const promise = new Promise((done) => {
      resolve = done;
    });
    const current = { id, controller, promise, resolve };
    operation = current;
    replace({ ...snapshot, pending: true, error: "", permissionDenied: false });
    emit();
    const active = () =>
      operation === current && generation === id && !controller.signal.aborted;
    Promise.resolve().then(async () => {
      let stage = "position",
        timer;
      try {
        const reading = safeReading(await locate(), now());
        if (!active()) return;
        if (!reading) throw new Error("Invalid browser location");
        stage = "lookup";
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("Lookup timed out"));
          }, lookupTimeoutMs);
        });
        const result = await Promise.race([
          lookup(reading, controller.signal),
          timeout,
        ]);
        if (!active()) return;
        const area = discoveryArea(result);
        if (!area) throw new Error("No usable discovery area");
        operation = null;
        commit(area, "current");
        resolve(area);
      } catch (error) {
        if (operation !== current || generation !== id) return;
        operation = null;
        const denied =
          error?.code === 1 ||
          error?.name === "NotAllowedError" ||
          /permission (?:was )?denied/iu.test(error?.message || "");
        const timedOut =
          error?.name === "AbortError" ||
          /timed?\s*out/iu.test(error?.message || "");
        replace({
          ...snapshot,
          pending: false,
          permissionDenied: denied,
          error: denied
            ? "Location permission was denied. Enter your area manually, or check your browser's site settings."
            : timedOut
              ? "Location lookup timed out. Retry or enter your area manually."
              : stage === "position"
                ? "Your current location is unavailable. Enter your area manually."
                : error?.message === "No usable discovery area"
                  ? "No usable city, area or PIN code was found. Enter your area manually."
                  : "Address suggestions are unavailable. Enter your area manually.",
        });
        emit();
        resolve(null);
      } finally {
        clearTimeout(timer);
      }
    });
    return promise;
  }
  function setCaptureScope(next) {
    const valid = validScope(next) ? next : null;
    if (scope === valid) {
      read();
      return;
    }
    if (invalidateCapture()) replace({ ...snapshot, pending: false });
    lookup = createLookup();
    scope = valid;
    initialized = false;
    snapshot = valid
      ? freezeSnapshot({ ...neutral, ready: true, scope })
      : emptyDiscoverySnapshot;
    restore();
    emit();
  }
  function storageChanged(event) {
    if (
      event.key &&
      event.key !== discoveryStorageKey &&
      event.key !== discoveryStorageKeyForScope(scope)
    )
      return;
    if (scope && unsaved.has(scope)) return;
    invalidateCapture();
    lookup = createLookup();
    restore();
    emit();
  }
  return {
    getSnapshot: read,
    subscribe(listener) {
      if (!listeners.size) events?.addEventListener("storage", storageChanged);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size)
          events?.removeEventListener("storage", storageChanged);
      };
    },
    choose,
    captureCurrent,
    cancelCapture,
    setCaptureScope,
    dismiss() {
      read();
      if (!scope) return;
      invalidateCapture();
      replace({ ...snapshot, dismissed: true, pending: false });
      persist();
      emit();
    },
    clear() {
      read();
      if (!scope) return;
      invalidateCapture();
      lookup = createLookup();
      replace({
        ...neutral,
        ready: true,
        scope,
        dismissed: true,
        storageAvailable: snapshot.storageAvailable,
      });
      persist();
      emit();
    },
  };
}
