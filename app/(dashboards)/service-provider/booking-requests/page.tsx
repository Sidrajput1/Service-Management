"use client";

import { useState } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import {
  CalendarClock,
  CheckCircle2,
  MapPin,
  UserRound,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAcceptBookingRequest,
  useDeclineBookingRequest,
  useProviderBookingRequests,
  type ProviderBookingRequest,
} from "@/hooks/useProviderBookingRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatServiceAddress } from "@/lib/service-location-client.mjs";
import { money } from "@/lib/customer-types";
import { useFinanceQuery } from "@/hooks/useFinance";
import type { CommissionPreview } from "@/lib/finance-types";
import { CommissionTerms } from "@/components/finance/CommissionTerms";

function failureMessage(error: unknown, fallback: string) {
  return isAxiosError(error) && typeof error.response?.data?.error === "string"
    ? error.response.data.error
    : fallback;
}
function RequestCard({ request }: { request: ProviderBookingRequest }) {
  const accept = useAcceptBookingRequest(),
    decline = useDeclineBookingRequest();
  const [confirmed, setConfirmed] = useState(false);
  const requiresConfirmation = request.coverage.requiresProviderConfirmation;
  const busy = accept.isPending || decline.isPending;
  const commission = useFinanceQuery<CommissionPreview>(`/service-provider/finance/commission-rule?offeringId=${request.serviceOfferingId?._id || ""}`,Boolean(request.serviceOfferingId?._id));
  return (
    <article className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          {request.serviceOfferingId?.name || request.serviceName}
        </h2>
        <Badge variant="outline">
          {requiresConfirmation
            ? "Area confirmation needed"
            : "In configured service area"}
        </Badge>
      </div>
      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2">
          <UserRound className="size-4 shrink-0" />
          {request.customerId?.name || "Customer"}
        </p>
        <p className="flex gap-2">
          <CalendarClock className="size-4 shrink-0" />
          {request.preferredDate
            ? new Date(request.preferredDate).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "Flexible schedule"}
        </p>
        <p className="flex gap-2 sm:col-span-2">
          <MapPin className="size-4 shrink-0" />
          {formatServiceAddress(request.address) || "Address unavailable"}
        </p>
      </div>
      <p className="text-sm font-medium">
        Request price: {money(request.pricing?.finalPrice || 0)}
      </p>
      {request.description && (
        <p className="text-sm text-muted-foreground">{request.description}</p>
      )}
      {requiresConfirmation && (
        <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-4 text-sm">
          <p className="flex gap-2 font-semibold">
            <AlertTriangle className="size-4 shrink-0" />
            {request.coverage.currentStatus === "uncertain"
              ? "Coverage could not be confirmed — review this destination."
              : "Outside configured service area — customer needs provider confirmation."}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 leading-relaxed">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-primary"
              disabled={busy}
            />
            <span>
              I have reviewed this service address. By accepting, I confirm my
              team is willing and able to visit this destination outside our
              configured service area.
            </span>
          </label>
        </div>
      )}
      {commission.data?.policy ? <CommissionTerms policy={commission.data.policy} accepted={commission.data.accepted} basis={commission.data.basisLabel}/> : <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">{commission.isError ? "Commission details could not be loaded. Refresh before accepting." : commission.isLoading ? "Loading the applicable commission rule…" : "No commission rule is configured. Financial calculation will wait for admin review; no percentage has been assumed."}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            try {
              await decline.mutateAsync(request._id);
              toast.success("Request declined");
            } catch (error) {
              toast.error(failureMessage(error, "Unable to decline request"));
            }
          }}
        >
          <XCircle className="mr-2 size-4" />
          {decline.isPending ? "Declining…" : "Decline"}
        </Button>
        <Button
          disabled={busy || commission.isLoading || commission.isError || Boolean(commission.data?.policy && !commission.data.accepted) || (requiresConfirmation && !confirmed)}
          onClick={async () => {
            try {
              await accept.mutateAsync({
                requestId: request._id,
                confirmOutOfArea: requiresConfirmation ? confirmed : undefined,
                coverageReviewToken: request.coverageReviewToken,
              });
              toast.success("Booking request accepted");
            } catch (error) {
              setConfirmed(false);
              toast.error(failureMessage(error, "Unable to accept request"));
            }
          }}
        >
          <CheckCircle2 className="mr-2 size-4" />
          {accept.isPending ? "Accepting…" : "Accept request"}
        </Button>
      </div>
    </article>
  );
}
export default function ProviderBookingRequestsPage() {
  const {
    requests,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useProviderBookingRequests();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Operations / Booking requests
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Customer requests
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review the actual service destination before accepting a request for
          your team.
        </p>
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Awaiting your response</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          ) : isError ? (
            <p className="p-8 text-center text-muted-foreground">
              Unable to load requests. Please refresh and try again.
            </p>
          ) : requests.length ? (
            <div className="divide-y divide-border">
              {requests.map((request) => (
                <RequestCard
                  key={`${request._id}:${request.coverageReviewToken}`}
                  request={request}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <CalendarClock className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-semibold">No new requests</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Customers who choose your services will appear here.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/service-provider/services">Manage services</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {hasNextPage && (
        <Button
          variant="outline"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more requests"}
        </Button>
      )}
    </div>
  );
}
