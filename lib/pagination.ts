import { z } from "zod";
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID");
export function readPage(request: Request) {
  const params = new URL(request.url).searchParams;
  const cursor = params.get("cursor");
  if (cursor) objectIdSchema.parse(cursor);
  const requested = Number(params.get("limit") || 20);
  return { cursor, limit: Number.isFinite(requested) ? Math.min(50, Math.max(1, Math.floor(requested))) : 20 };
}
export function pageResult<T extends { _id: unknown }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  return { items, nextCursor: hasMore ? String(items[items.length - 1]._id) : null };
}
