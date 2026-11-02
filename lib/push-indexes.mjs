/** Pure shared index contract for the model, runtime readiness and deployment preflight. */
export const pushIndexDefinitions = [
  ["pushsubscriptions", { endpoint: 1 }, { unique: true }],
  ["pushsubscriptions", { userId: 1, isActive: 1 }, {}],
  [
    "notifications",
    { dedupeKey: 1 },
    {
      unique: true,
      partialFilterExpression: { dedupeKey: { $type: "string" } },
    },
  ],
];
function canonical(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, canonical(item)]),
      )
    : value;
}
export function matchesPushIndex(indexes, keys, options) {
  return indexes.some(
    (index) =>
      index &&
      typeof index === "object" &&
      JSON.stringify(index.key) === JSON.stringify(keys) &&
      Boolean(index.unique) === Boolean(options.unique) &&
      JSON.stringify(canonical(index.partialFilterExpression || {})) ===
        JSON.stringify(canonical(options.partialFilterExpression || {})),
  );
}
