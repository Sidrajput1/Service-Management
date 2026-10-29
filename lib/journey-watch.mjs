/** Foreground-only controller. Dependencies are injectable for lifecycle tests without real GPS. */
export function watchJourney({
  geolocation,
  send,
  onState,
  onArrival,
  onAccepted,
  intervalMs = 10000,
  requestTimeoutMs = 10000,
  eligible = false,
  now = () => Date.now(),
}) {
  let stopped = false,
    inFlight = false,
    lastSent = -Infinity,
    watchId,
    abort,
    requestTimer,
    cancelRequest,
    watchCleared = false;
  const cancelled = Symbol("cancelled");
  const clearWatcher = () => {
    if (watchId === undefined || watchCleared) return;
    watchCleared = true;
    geolocation.clearWatch(watchId);
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearWatcher();
    clearTimeout(requestTimer);
    abort?.abort();
    cancelRequest?.(cancelled);
  };
  const receive = async (position) => {
    if (stopped || inFlight || now() - lastSent < intervalMs) return;
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
      !Number.isSafeInteger(reading.observedAt) ||
      reading.observedAt <= 0 ||
      now() - reading.observedAt > 30000 ||
      reading.observedAt - now() > 5000 ||
      reading.accuracy <= 0
    ) {
      stop();
      onState("unavailable");
      return;
    }
    if (reading.accuracy > 100000) {
      onState("poor_accuracy");
      return;
    }
    inFlight = true;
    lastSent = now();
    abort = new AbortController();
    let timedOut = false;
    onState("reporting");
    try {
      const timeout = new Promise((_, reject) => {
        requestTimer = setTimeout(
          () => {
            timedOut = true;
            abort.abort();
            reject(
              Object.assign(new Error("Location request timed out"), {
                name: "NetworkTimeoutError",
              }),
            );
          },
          Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0
            ? Math.min(requestTimeoutMs, 15000)
            : 10000,
        );
      });
      const cancelledRequest = new Promise((resolve) => {
        cancelRequest = resolve;
      });
      const result = await Promise.race([
        send(reading, abort.signal),
        timeout,
        cancelledRequest,
      ]);
      if (stopped) return;
      if (result === cancelled) return;
      if (
        result?.success !== true ||
        !["enroute", "arrived"].includes(result.status)
      )
        throw new Error("Invalid location acknowledgement");
      if (result.status === "arrived" && result.state === "arrived") {
        if (result.transitioned === true)
          onAccepted?.({ acceptedAt: now(), accuracyMeters: reading.accuracy });
        stop();
        onState("arrived");
        onArrival?.();
      } else if (
        result.status === "enroute" &&
        ["outside", "qualifying"].includes(result.state)
      ) {
        onAccepted?.({ acceptedAt: now(), accuracyMeters: reading.accuracy });
        onState(result.state);
      } else if (
        result.status === "enroute" &&
        ["poor_accuracy", "implausible_jump"].includes(result.state)
      ) {
        onState(result.state);
      } else throw new Error("Invalid location acknowledgement");
    } catch (error) {
      if (stopped) return;
      if ([401, 403, 404, 409].includes(error?.status)) {
        stop();
        onState("ineligible");
        onArrival?.();
      } else if (error?.status === 429) onState("throttled");
      else if (timedOut || error?.name === "NetworkTimeoutError")
        onState("network_timeout");
      else onState("interrupted");
    } finally {
      clearTimeout(requestTimer);
      cancelRequest = undefined;
      inFlight = false;
    }
  };
  if (!eligible) return { stop };
  onState("requesting");
  try {
    watchId = geolocation.watchPosition(
      receive,
      (error) => {
        if (stopped) return;
        stop();
        onState(
          error.code === 1
            ? "denied"
            : error.code === 3
              ? "timeout"
              : "unavailable",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  } catch {
    stop();
    onState("unavailable");
  }
  if (stopped) clearWatcher();
  return { stop };
}
