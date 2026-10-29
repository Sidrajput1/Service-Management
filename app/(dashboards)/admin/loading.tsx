export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading administration"
      className="space-y-5"
    >
      <div className="h-16 max-w-xl animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
