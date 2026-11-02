// Retire the public demo in every environment. Never restore account credentials here.
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export function GET() {
  return new Response("Not found.", { status: 404, headers });
}

export function HEAD() {
  return new Response(null, { status: 404, headers });
}
