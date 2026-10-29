"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  MapPin,
  UserRound,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useNewCustomerBooking } from "@/hooks/useCustomerBookings";
import { CustomerPageHeading, CustomerState, StatusBadge } from "./CustomerUi";
import BookingTimeline from "./BookingTimeline";
import BookingReviewCard from "./BookingReviewCard";
import JobChatPanel from "@/components/chat/JobChatPanel";
import { ServiceAddressPreview } from "@/components/maps/ServiceAddressPreview";
import { useJobStatusConnection } from "@/hooks/useJobStatusConnection";
import { dateTime, proCopy, type BookingDetail } from "@/lib/customer-types";
import { FinalBillPanel } from "@/components/finance/FinalBillPanel";
import { CancellationPanel, RepeatBookingButton } from "@/components/finance/BookingActions";
export function CustomerBookingView({ id }: { id: string }) {
  const query = useNewCustomerBooking(id);
  const data = query.data as BookingDetail | undefined;
  const { data: session } = useSession();
  useJobStatusConnection(data?.job?._id, id);
  return (
    <>
      <CustomerPageHeading
        eyebrow="EVERY STEP, IN ONE PLACE"
        title={
          data?.service?.name || data?.booking.serviceType || "Your booking"
        }
        description="Service details, progress, your Pro, and the finishing touches."
        back="/customer/bookings"
      />
      <CustomerState
        loading={query.isLoading}
        error={query.isError && !data}
        retry={() => query.refetch()}
      >
        {data && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={data.job?.status || data.booking.status} />
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw
                  className={`size-3 ${query.isFetching ? "animate-spin" : ""}`}
                />
                {query.isError
                  ? "Updates delayed; showing saved information"
                  : `Last checked ${new Date(query.dataUpdatedAt).toLocaleTimeString("en-IN")}`}
              </p>
            </div>
            {data.job?.status === "arrived" && (
              <p
                role="status"
                className="mb-6 customer-panel bg-secondary/40 text-sm leading-7"
              >
                Your Pro has arrived at the service address. Share the visit
                verification code only when you are ready to begin.
              </p>
            )}
            <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
              <div className="space-y-6">
                <section className="customer-panel">
                  <h2 className="font-display text-lg font-semibold">
                    Your service
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {data.provider?.companyName ||
                      "Provider details will appear when confirmed"}
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div className="flex gap-3">
                      <CalendarDays className="mt-1 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Scheduled visit
                        </p>
                        <p className="mt-1 text-sm leading-6">
                          {dateTime(
                            data.job?.scheduledAt || data.booking.scheduledAt,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <MapPin className="mt-1 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Service address
                        </p>
                        <p className="mt-1 text-sm leading-6">
                          {[
                            data.booking.address?.addressLine,
                            data.booking.address?.city,
                            data.booking.address?.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Address not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-5 break-all text-[10px] text-muted-foreground">
                    Booking reference: {id}
                  </p>
                </section>
                <section className="customer-panel">
                  <h2 className="mb-5 font-display text-lg font-semibold">
                    Job progress
                  </h2>
                  <BookingTimeline
                    steps={(data.timeline || []).map((step) => ({
                      key: step.key,
                      label: proCopy(step.title),
                      note: proCopy(step.description),
                      done: step.completed,
                      active: step.current,
                      date: step.timestamp,
                    }))}
                  />
                </section>
                {data.job?.status === "completed" && (
                  <BookingReviewCard
                    bookingId={id}
                    jobStatus={data.job.status}
                  />
                )}
              </div>
              <aside className="space-y-6">
                <section className="customer-panel">
                  <div className="flex items-center gap-4">
                    <span className="flex size-13 items-center justify-center rounded-2xl bg-secondary text-brand-teal-dark">
                      <UserRound className="size-6" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold">Meet your Pro</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {data.technician?.userId?.name ||
                          (data.technician
                            ? "Your assigned service Pro"
                            : "Assignment pending")}
                      </p>
                    </div>
                  </div>
                  {data.technician?.skills?.length ? (
                    <p className="mt-4 text-xs leading-6 text-muted-foreground">
                      {data.technician.skills.join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {data.tracking
                      ? proCopy(data.tracking.description)
                      : "Your provider will assign a Pro after accepting the booking."}
                  </p>
                  {data.job?._id && session?.user?.id && (
                    <div className="mt-5">
                      <JobChatPanel
                        jobId={data.job._id}
                        currentUserId={session.user.id}
                        currentUserRole="customer"
                        currentUserName={session.user.name || undefined}
                        triggerLabel="Chat with your Pro"
                      />
                    </div>
                  )}
                </section>
                {data.job?.otp &&
                  ![
                    "completed",
                    "cancelled",
                    "in_progress",
                    "otp_verified",
                  ].includes(data.job.status) && (
                    <section className="customer-panel bg-secondary/40">
                      <h2 className="text-sm font-bold">
                        Your visit verification code
                      </h2>
                      <p className="mt-3 text-2xl font-bold tracking-[.25em] text-primary">
                        {data.job.otp}
                      </p>
                      <p className="mt-3 text-xs leading-6 text-muted-foreground">
                        Share this code only when your Pro is at the service
                        address and ready to begin.
                      </p>
                    </section>
                  )}
                <ServiceAddressPreview address={data.booking.address} />
                <section className="customer-panel">
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <FileText className="size-4 text-primary" />
                    Invoice & payment
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {data.invoice
                      ? "View your service line items and current payment information."
                      : "Your invoice will appear here when it is issued by the service team."}
                  </p>
                  {data.invoice && (
                    <Link
                      href={`/customer/invoice/${data.invoice._id}`}
                      className="public-button public-button-outline mt-5 w-full"
                    >
                      View invoice
                    </Link>
                  )}
                </section>
                {data.invoice && <FinalBillPanel invoiceId={data.invoice._id}/>}
                {data.job?.status === "completed" && <RepeatBookingButton bookingId={id}/>}
                <CancellationPanel bookingId={id}/>
                <p className="px-2 text-xs leading-6 text-muted-foreground">
                  Need a change or help with this booking? Contact your service
                  team through the job conversation. Available cancellation options appear above. Rescheduling needs the service team’s help.
                </p>
              </aside>
            </div>
          </>
        )}
      </CustomerState>
    </>
  );
}
