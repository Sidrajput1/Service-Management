/** Explicit one-shot capture. This helper never runs until its caller invokes it. */
export function getCurrentLocation({
  geolocation = globalThis.navigator?.geolocation,
  secure = globalThis.isSecureContext,
  now = () => Date.now(),
} = {}) {
  return new Promise((resolve, reject) => {
    if (!secure || !geolocation) {
      reject(
        new Error(
          "Current location is unavailable here. Enter your location manually.",
        ),
      );
      return;
    }
    let settled = false;
    const finish = (error, reading) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(reading);
    };
    const timer = setTimeout(
      () =>
        finish(new Error("Location timed out. Retry or enter it manually.")),
      21000,
    );
    try {
      geolocation.getCurrentPosition(
        (position) => {
          const reading = {
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
            accuracy: position?.coords?.accuracy,
            observedAt: position?.timestamp,
          };
          if (
            ![
              reading.latitude,
              reading.longitude,
              reading.accuracy,
              reading.observedAt,
            ].every(Number.isFinite) ||
            Math.abs(reading.latitude) > 90 ||
            Math.abs(reading.longitude) > 180 ||
            reading.accuracy <= 0 ||
            reading.accuracy > 100000 ||
            !Number.isInteger(reading.observedAt) ||
            reading.observedAt <= 0 ||
            now() - reading.observedAt > 600000 ||
            reading.observedAt - now() > 5000
          ) {
            finish(
              new Error(
                "The browser returned an invalid location. Retry or enter it manually.",
              ),
            );
            return;
          }
          finish(null, reading);
        },
        (error) =>
          finish(
            new Error(
              error?.code === 1
                ? "Location permission was denied. You can continue with manual entry."
                : error?.code === 3
                  ? "Location timed out. Retry or enter it manually."
                  : "Your current location could not be found. Enter it manually.",
            ),
          ),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    } catch {
      finish(
        new Error(
          "Location is unavailable. You can continue with manual entry.",
        ),
      );
    }
  });
}

/** Only structured, nonempty suggestions may replace editable form values. */
export function mergeSuggestedAddress(current, suggestion) {
  const next = { ...current };
  for (const key of ["addressLine", "locality", "city", "state", "pincode"]) {
    const value = suggestion?.[key];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > (key === "addressLine" ? 300 : 100)
    )
      continue;
    if (key === "pincode" && !/^[1-9]\d{5}$/.test(value.trim())) continue;
    next[key] = value.trim();
  }
  return next;
}

/** Private interaction-scoped reuse; never persist this cache or share across customers. */
export function createAddressLookup({ fetcher = globalThis.fetch } = {}) {
  let cachedKey, cachedAddress;
  let pendingKey, pending;
  return async (reading, signal) => {
    const key = `${reading.latitude}|${reading.longitude}`;
    if (signal?.aborted) throw new Error("Lookup cancelled");
    if (key === cachedKey) return { ...cachedAddress };
    if (key === pendingKey && pending) return { ...(await pending) };
    pendingKey = key;
    const work = (async () => {
      const response = await fetcher("/api/location/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
        signal,
        cache: "no-store",
      });
      const result = await response.json();
      if (
        !response.ok ||
        !result?.address ||
        typeof result.address !== "object" ||
        signal?.aborted
      )
        throw new Error("Lookup unavailable");
      const address = mergeSuggestedAddress({}, result.address);
      if (!Object.keys(address).length)
        throw new Error("No usable address suggestion");
      cachedKey = key;
      cachedAddress = address;
      return { ...address };
    })();
    pending = work;
    try {
      return await work;
    } finally {
      if (pending === work) {
        pendingKey = undefined;
        pending = undefined;
      }
    }
  };
}
