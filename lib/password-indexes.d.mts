export const passwordIndexDefinitions: [string, Record<string, 1>, { unique?: boolean; expireAfterSeconds?: number }][];
export function matchesPasswordIndex(indexes: { key?: unknown; unique?: boolean; expireAfterSeconds?: number }[], keys: Record<string, 1>, options: { unique?: boolean; expireAfterSeconds?: number }): boolean;
