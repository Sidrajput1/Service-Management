"use client";
import { useState } from "react";
import Link from "next/link";
import { useProviderCustomers } from "@/hooks/useProviderCustomers";
import {
  ProviderHeading,
  ProviderState,
} from "@/components/provider/ProviderUi";
import { CursorPager } from "@/components/customer/CustomerUi";
import { dateTime } from "@/lib/customer-types";
export default function ProviderCustomersPage() {
  const [history, setHistory] = useState<string[]>([]);
  const query = useProviderCustomers(history.at(-1));
  return (
    <>
      <ProviderHeading
        title="Your customers"
        description="Customers with bookings at your business. Contact details are shown only within this business relationship."
      />
      <ProviderState
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      >
        {!query.data?.customers.length ? (
          <div className="provider-panel text-center">
            <h2 className="font-semibold">
              Your customer relationships start here
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Customers appear when a booking is created for your business.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {query.data.customers.map((row) => (
              <article key={row._id} className="provider-panel">
                <h2 className="font-semibold">
                  {row.customer?.name || "Customer"}
                </h2>
                <p className="mt-3 break-all text-sm text-muted-foreground">
                  {[row.customer?.email, row.customer?.phone]
                    .filter(Boolean)
                    .join(" · ") || "Contact details unavailable"}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {row.bookingCount} booking{row.bookingCount === 1 ? "" : "s"}{" "}
                  · Latest {dateTime(row.lastBookedAt)}
                </p>
                <Link
                  href={`/service-provider/bookings/${row.lastBookingId}`}
                  className="public-text-link mt-3"
                >
                  View latest booking
                </Link>
              </article>
            ))}
          </div>
        )}
        <CursorPager
          history={history}
          change={setHistory}
          nextCursor={query.data?.nextCursor}
        />
      </ProviderState>
    </>
  );
}
