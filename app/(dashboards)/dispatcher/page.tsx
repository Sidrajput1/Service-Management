import Link from "next/link";
export default function DispatchOperations() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Dispatch operations</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Manage the existing lead, booking, job and billing workflows.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {["leads", "bookings", "jobs", "billing"].map((item) => (
          <Link
            key={item}
            href={`/dispatcher/${item}`}
            className="provider-panel font-semibold capitalize"
          >
            {item} →
          </Link>
        ))}
      </div>
    </>
  );
}
