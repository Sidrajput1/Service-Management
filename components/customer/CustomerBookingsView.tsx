"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, ArrowUpRight, Wrench, RefreshCw } from "lucide-react";
import { useNewCustomerBookings } from "@/hooks/useCustomerBookings";
import { useCustomerRequests } from "@/hooks/useCustomerRequests";
import { CustomerPageHeading, CustomerState, CursorPager, StatusBadge } from "./CustomerUi";
import { dateTime, money, type BookingSummary } from "@/lib/customer-types";

function BookingRows({ status }: { status: string }) {
  const [history, setHistory] = useState<string[]>([]);
  const query = useNewCustomerBookings(status, history.at(-1));
  const bookings: BookingSummary[] = query.data?.bookings || [];
  return <CustomerState loading={query.isLoading} error={query.isError && !query.data} empty={!bookings.length && !query.isError} emptyFooter={<CursorPager history={history} change={setHistory} nextCursor={query.data?.nextCursor} />} retry={() => query.refetch()} message="There are no bookings in this view. Explore a service to make your first request.">
    {query.isError && <p role="status" className="mb-4 text-sm text-primary">Updates are delayed. Showing the last loaded information.</p>}
    <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground"><span>{bookings.length} bookings on this page</span><span className="inline-flex items-center gap-1.5"><RefreshCw className={`size-3 ${query.isFetching ? "animate-spin" : ""}`} />{query.isFetching ? "Refreshing…" : "Updates refresh automatically"}</span></div>
    <div className="space-y-4">{bookings.map(booking => <article key={booking._id} className="customer-panel flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-secondary text-brand-teal-dark"><Wrench className="size-6" strokeWidth={1.5} /></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-base font-semibold">{booking.serviceOffering?.name || booking.serviceType}</h2><StatusBadge status={booking.customerStatus} /></div><p className="mt-1.5 text-sm text-muted-foreground">{booking.provider?.companyName || "Service provider"}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{dateTime(booking.scheduledAt)}</span>{booking.address?.city && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{booking.address.city}</span>}</div></div>
      <Link href={`/customer/bookings/${booking._id}`} className="public-button public-button-outline">View booking <ArrowUpRight className="size-4" /></Link>
    </article>)}</div><CursorPager history={history} change={setHistory} nextCursor={query.data?.nextCursor} />
  </CustomerState>;
}
function RequestRows() {
  const [history, setHistory] = useState<string[]>([]);
  const query = useCustomerRequests(history.at(-1));
  return <CustomerState loading={query.isLoading} error={query.isError && !query.data} empty={!query.data?.requests.length && !query.isError} emptyFooter={<CursorPager history={history} change={setHistory} nextCursor={query.data?.nextCursor} />} retry={() => query.refetch()} message="No pending service requests. Accepted requests appear in My bookings.">
    <p className="mb-5 rounded-xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">A request becomes a booking when the service provider accepts it. Your confirmed bookings appear in the other views.</p>
    <div className="space-y-4">{query.data?.requests.map(request => <article key={request._id} className="customer-panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display font-semibold">{request.serviceName}</h2><p className="mt-2 text-sm text-muted-foreground">{request.serviceProviderId?.companyName || "Service provider"}</p></div><StatusBadge status={request.status} /></div><div className="mt-5 grid gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-3"><span>Preferred: {dateTime(request.preferredDate)}</span><span>{request.address?.city || "Your service address"}</span><span>Listed service price: {money(request.pricing.finalPrice)} + applicable tax</span></div><p className="mt-3 break-all text-[10px] text-muted-foreground">Request reference: {request._id}</p></article>)}</div><CursorPager history={history} change={setHistory} nextCursor={query.data?.nextCursor} />
  </CustomerState>;
}
export function CustomerBookingsView({ initialView = "all" }: { initialView?: string }) {
  const [view, setView] = useState(initialView === "requests" ? "requests" : "all");
  return <><CustomerPageHeading eyebrow="YOUR SERVICES, TOGETHER" title="My bookings" description="From a fresh request to the finishing touches. Find the details, follow progress, and stay in touch with your service team." /><div className="mb-7 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Booking status">{["all", "upcoming", "active", "completed", "cancelled", "requests"].map(status => <button key={status} type="button" aria-pressed={view === status} aria-controls="booking-results" id={`tab-${status}`} onClick={() => setView(status)} className={`min-h-11 shrink-0 rounded-full border px-5 text-xs font-semibold capitalize ${view === status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>{status === "all" ? "All bookings" : status === "requests" ? "Service requests" : status}</button>)}</div><section  id="booking-results" aria-labelledby={`tab-${view}`} key={view}>{view === "requests" ? <RequestRows /> : <BookingRows status={view} />}</section></>;
}
