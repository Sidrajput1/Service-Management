export default function Loading() {
  return (
    <div role="status" className="space-y-5">
      <span className="sr-only">Loading your business workspace</span>
      <div className="h-14 w-2/3 animate-pulse rounded-xl bg-muted" />
      <div className="h-80 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
