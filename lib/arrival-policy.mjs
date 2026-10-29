export const defaultArrivalConfig = {
  radiusMeters: 100,
  maxAccuracyMeters: 40,
  requiredReadings: 2,
  minReadingIntervalMs: 8000,
  minUpdateIntervalMs: 5000,
  maxReadingAgeMs: 30000,
  maxReadingGapMs: 45000,
  maxSpeedMetersPerSecond: 55,
  futureToleranceMs: 5000,
};
export function arrivalConfig(env = {}) {
  const specs = {
    radiusMeters: ["ARRIVAL_RADIUS_METERS", 100, 25, 500],
    maxAccuracyMeters: ["ARRIVAL_MAX_ACCURACY_METERS", 40, 5, 100],
    requiredReadings: ["ARRIVAL_REQUIRED_READINGS", 2, 2, 5],
    minReadingIntervalMs: [
      "ARRIVAL_MIN_READING_INTERVAL_MS",
      8000,
      5000,
      30000,
    ],
  };
  const result = { ...defaultArrivalConfig };
  for (const [key, [variable, fallback, min, max]] of Object.entries(specs)) {
    const input = Number(env[variable] || fallback);
    if (
      !Number.isFinite(input) ||
      input < min ||
      input > max ||
      !Number.isInteger(input)
    )
      throw new Error(`Invalid arrival configuration: ${variable}`);
    result[key] = input;
  }
  result.maxReadingGapMs = Math.max(45000, result.minReadingIntervalMs * 3);
  return result;
}
export function haversineMeters(a, b) {
  const rad = (value) => (value * Math.PI) / 180,
    dLat = rad(b.latitude - a.latitude),
    dLon = rad(b.longitude - a.longitude),
    h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.latitude)) *
        Math.cos(rad(b.latitude)) *
        Math.sin(dLon / 2) ** 2;
  return (
    6371000 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)))
  );
}
export function readingIssue(reading, now, config = defaultArrivalConfig) {
  if (
    !reading ||
    typeof reading.latitude !== "number" ||
    !Number.isFinite(reading.latitude) ||
    Math.abs(reading.latitude) > 90 ||
    typeof reading.longitude !== "number" ||
    !Number.isFinite(reading.longitude) ||
    Math.abs(reading.longitude) > 180 ||
    typeof reading.accuracy !== "number" ||
    !Number.isFinite(reading.accuracy) ||
    reading.accuracy <= 0 ||
    reading.accuracy > 100000 ||
    !Number.isSafeInteger(reading.observedAt)
  )
    return "invalid";
  if (
    now - reading.observedAt > config.maxReadingAgeMs ||
    reading.observedAt - now > config.futureToleranceMs
  )
    return "stale";
  return null;
}
export function evaluateArrival(
  previous,
  reading,
  destination,
  now,
  key,
  technicianId,
  config = defaultArrivalConfig,
) {
  const issue = readingIssue(reading, now, config);
  if (issue) return { error: issue };
  const sameJourney =
      previous?.destinationKey === key &&
      String(previous?.technicianId) === String(technicianId),
    prior = sameJourney ? previous : null;
  if (
    prior?.lastReceivedAt &&
    now - new Date(prior.lastReceivedAt).getTime() < config.minUpdateIntervalMs
  )
    return { error: "rate_limited" };
  if (
    prior?.lastObservedAt &&
    reading.observedAt <= new Date(prior.lastObservedAt).getTime()
  )
    return { error: "out_of_order" };
  const base = {
    destinationKey: key,
    technicianId,
    lastReceivedAt: new Date(now),
    lastObservedAt: new Date(reading.observedAt),
    qualifyingCount: 0,
    ...(prior?.pointObservedAt
      ? {
          latitude: prior.latitude,
          longitude: prior.longitude,
          accuracy: prior.accuracy,
          pointObservedAt: prior.pointObservedAt,
        }
      : {}),
  };
  if (reading.accuracy > config.maxAccuracyMeters)
    return { state: "poor_accuracy", tracking: base, arrived: false };
  if (prior?.latitude !== undefined && prior?.pointObservedAt) {
    const seconds =
      (reading.observedAt - new Date(prior.pointObservedAt).getTime()) / 1000;
    const distance = haversineMeters(prior, reading);
    if (
      seconds > 0 &&
      distance >
        config.maxSpeedMetersPerSecond * seconds +
          (prior.accuracy || 0) +
          reading.accuracy
    )
      return { state: "implausible_jump", tracking: base, arrived: false };
  }
  const distance = haversineMeters(reading, destination),
    tracking = {
      ...base,
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy: reading.accuracy,
      pointObservedAt: new Date(reading.observedAt),
    };
  if (distance + reading.accuracy > config.radiusMeters)
    return { state: "outside", tracking, arrived: false };
  const elapsed = prior?.lastQualifiedAt
    ? reading.observedAt - new Date(prior.lastQualifiedAt).getTime()
    : Infinity;
  if (prior?.qualifyingCount && elapsed < config.minReadingIntervalMs)
    return {
      state: "qualifying",
      tracking: {
        ...tracking,
        qualifyingCount: prior.qualifyingCount,
        lastQualifiedAt: prior.lastQualifiedAt,
      },
      arrived: false,
    };
  const count =
    prior?.qualifyingCount && elapsed <= config.maxReadingGapMs
      ? prior.qualifyingCount + 1
      : 1;
  return {
    state: count >= config.requiredReadings ? "arrived" : "qualifying",
    tracking: {
      ...tracking,
      qualifyingCount: count,
      lastQualifiedAt: new Date(reading.observedAt),
    },
    arrived: count >= config.requiredReadings,
  };
}
