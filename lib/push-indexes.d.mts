export interface PushIndexOptions {
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
}
export const pushIndexDefinitions: readonly [
  string,
  Record<string, number>,
  PushIndexOptions,
][];
export function matchesPushIndex(
  indexes: readonly unknown[],
  keys: Record<string, number>,
  options: PushIndexOptions,
): boolean;
