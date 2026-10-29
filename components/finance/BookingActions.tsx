"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFinanceQuery, useFinanceAction } from "@/hooks/useFinance";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { fieldClass, financeError, financeDate } from "./FinanceUi";
interface CancelData {
  canCancel: boolean;
  reasons: Record<string, string>;
  record: {
    reason: string;
    note?: string;
    actorRole: string;
    cancelledAt: string;
    feedbackSaved: boolean;
    reviewStatus: string;
  } | null;
}
export function CancellationPanel({ bookingId }: { bookingId: string }) {
  const { data: session } = useSession(),
    query = useFinanceQuery<CancelData>(`/bookings/${bookingId}/cancellation`),
    mutation = useFinanceAction(`/bookings/${bookingId}/cancellation`);
  const [reason, setReason] = useState(""),
    [note, setNote] = useState(""),
    [answer, setAnswer] = useState(""),
    [open, setOpen] = useState(false);
  const data = query.data;
  if (!data)
    return query.isError ? (
      <p className="text-xs text-muted-foreground">
        Cancellation details are unavailable.{" "}
        <button className="underline" onClick={() => void query.refetch()}>
          Try again
        </button>
      </p>
    ) : null;
  if (!data.canCancel && !data.record) return null;
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Booking changes</h2>
      {data.record ? (
        <>
          <p className="text-sm text-muted-foreground">
            Cancelled by {data.record.actorRole.replaceAll("_", " ")} on{" "}
            {financeDate(data.record.cancelledAt)}.
          </p>
          <p className="text-sm">
            Reason:{" "}
            {data.reasons[data.record.reason] ||
              data.record.reason.replaceAll("_", " ")}
          </p>
          {data.record.note && (
            <p className="break-words text-sm text-muted-foreground">
              {data.record.note}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            A cancellation does not confirm payment or a refund. Reports are
            reviewed before any action is taken.
          </p>
          {session?.user.role === "customer" && !data.record.feedbackSaved && (
            <form
              className="space-y-3 border-t border-border pt-4"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await mutation.mutateAsync({
                    action: "feedback",
                    answer,
                    note,
                  });
                  toast.success("Your feedback is saved. Thank you.");
                } catch (error) {
                  toast.error(financeError(error));
                }
              }}
            >
              <label className="block space-y-2 text-sm leading-6">
                <span>
                  Did the provider ask you to cancel this booking and complete
                  the service outside Servizato?
                </span>
                <select
                  required
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Choose an answer</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="not_sure">Not sure</option>
                  <option value="prefer_not">Prefer not to say</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span>Anything else? (optional)</span>
                <textarea
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className={`${fieldClass} min-h-20`}
                />
              </label>
              <Button
                type="submit"
                disabled={mutation.isPending || !answer}
                className="min-h-11"
              >
                Save feedback
              </Button>
            </form>
          )}
          {session?.user.role === "customer" && data.record.feedbackSaved && (
            <p role="status" className="text-sm text-muted-foreground">
              Your feedback has been saved for this cancellation.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm leading-6 text-muted-foreground">
            Use job chat for service questions. If you need to cancel, tell us
            why so the service team can respond.
          </p>
          <Button
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => setOpen((value) => !value)}
            disabled={mutation.isPending}
          >
            Cancel booking
          </Button>
          {open && (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await mutation.mutateAsync({
                    action: "cancel",
                    reason,
                    note,
                  });
                  toast.success(
                    "Booking cancelled. The saved history is retained.",
                  );
                  setOpen(false);
                } catch (error) {
                  toast.error(financeError(error));
                }
              }}
            >
              <label className="block space-y-2 text-sm">
                <span>Why are you cancelling?</span>
                <select
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Choose a reason</option>
                  {Object.entries(data.reasons).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span>Extra details (optional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  className={`${fieldClass} min-h-20`}
                />
              </label>
              <p className="text-xs leading-6 text-muted-foreground">
                This closes the booking. It does not create a payment,
                commission charge or refund.
              </p>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending || !reason}
                className="min-h-11 w-full"
              >
                {mutation.isPending ? "Cancelling…" : "Confirm cancellation"}
              </Button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
export function RepeatBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      className="min-h-11 w-full"
      disabled={busy}
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        try {
          const { data } = await api.get<{ destination: string }>(
            `/customer/bookings/${bookingId}/repeat`,
          );
          router.push(data.destination);
        } catch (error) {
          toast.error(financeError(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Checking current service…" : "Book this provider again"}
    </Button>
  );
}
