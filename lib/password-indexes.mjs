/** Explicit deployment migration only; models disable automatic index creation. */
export const passwordIndexDefinitions = [
  ["passwordresettokens", { tokenHash: 1 }, { unique: true }],
  ["passwordresettokens", { userId: 1 }, { unique: true }],
  ["passwordresettokens", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ["passwordratelimits", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
];
export function matchesPasswordIndex(indexes, keys, options) {
  return indexes.some(
    (index) =>
      JSON.stringify(index.key) === JSON.stringify(keys) &&
      Boolean(index.unique) === Boolean(options.unique) &&
      (options.expireAfterSeconds === undefined ||
        index.expireAfterSeconds === options.expireAfterSeconds),
  );
}
