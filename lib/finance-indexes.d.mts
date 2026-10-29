export const financeIndexDefinitions: [
  string,
  Record<string, 1 | -1>,
  { unique: true; partialFilterExpression?: Record<string, unknown> },
][];
export function matchingFinanceIndex(
  indexes: {
    unique?: boolean;
    key: unknown;
    partialFilterExpression?: unknown;
  }[],
  keys: Record<string, 1 | -1>,
  options: { partialFilterExpression?: unknown },
): boolean;
