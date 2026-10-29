"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { errorMessage, Feedback } from "@/components/provider/ProviderUi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { reasonRequired } from "@/lib/moderation-policy.mjs";
const labels: Record<string, string> = {
  approve: "Approve",
  reject: "Reject",
  request_changes: "Request changes",
  suspend: "Suspend business",
  restore: "Restore active status",
};
export function ReviewDecisionDialog({
  type,
  id,
  version,
  actions,
}: {
  type: "provider" | "offering";
  id: string;
  version: number;
  actions: string[];
}) {
  const [action, setAction] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState("");
  const requestId = useRef(""),
    router = useRouter();
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {actions.map((value) => (
          <Button
            key={value}
            variant={value === "approve" ? "default" : "outline"}
            className="h-11 px-5"
            onClick={() => {
              setAction(value);
              setReason("");
              setMessage("");
              requestId.current = crypto.randomUUID();
            }}
          >
            {labels[value]}
          </Button>
        ))}
      </div>
      <Feedback message={success} />
      <Dialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!busy && !open) setAction("");
        }}
      >
        <DialogContent className="max-w-lg! p-6">
          <DialogTitle>
            {labels[action]}{" "}
            {type === "provider" ? "this business" : "this offering"}?
          </DialogTitle>
          <DialogDescription>
            {type === "provider"
              ? "This decision changes business verification only. Each service offering requires its own approval. Existing confirmed bookings and invoices remain intact."
              : "This decision applies only to this offering. It does not approve the provider. Publication also requires an approved, active provider, active catalog service and matching coverage."}
          </DialogDescription>
          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              setMessage("");
              try {
                const { data } = await api.post<{
                  notificationPending?: boolean;
                }>(
                  `/admin/${type === "provider" ? "providers" : "offerings"}/${id}/decision`,
                  {
                    action,
                    reason,
                    expectedVersion: version,
                    requestId: requestId.current,
                  },
                );
                setAction("");
                setSuccess(
                  data.notificationPending
                    ? "Decision saved. Its notification is queued for retry."
                    : "Decision saved and provider notification recorded.",
                );
                router.refresh();
              } catch (error) {
                setMessage(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <label htmlFor="review-reason" className="provider-label">
                {reasonRequired(action)
                  ? "Reason (required)"
                  : "Review note (optional)"}
              </label>
              <textarea
                id="review-reason"
                className="provider-textarea"
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required={reasonRequired(action)}
                minLength={reasonRequired(action) ? 5 : undefined}
                maxLength={1000}
              />
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                The provider can see this feedback. Do not include secrets or
                unrelated personal information.
              </p>
            </div>
            <Feedback message={message} error />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="h-11" disabled={busy}>
                {busy
                  ? "Saving decision…"
                  : `Confirm ${labels[action]?.toLowerCase()}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={() => setAction("")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
