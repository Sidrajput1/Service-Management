"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { FinancePolicy } from "@/lib/finance-types";
import { useFinanceAction } from "@/hooks/useFinance";
import { Button } from "@/components/ui/button";
import { financeDate, financeError } from "./FinanceUi";
export function CommissionTerms({
  policy,
  accepted,
  basis,
}: {
  policy: FinancePolicy;
  accepted: boolean;
  basis: string;
}) {
  const [acknowledged, setAcknowledged] = useState(false),
    mutation = useFinanceAction("/service-provider/finance/ledger");
  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {policy.scope === "global"
              ? "Default commission"
              : `${policy.scope} rule · ${policy.scopeKey}`}
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            {policy.rateBps / 100}% commission
          </h3>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs">
          {accepted ? "Terms accepted" : "Please review"}
        </span>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Applies from {financeDate(policy.effectiveAt)} to eligible new bookings.
        Calculation: {basis}. Provider-specific rules take priority, then
        category rules, then the default.
      </p>
      <div className="space-y-3 border-y border-border py-4 text-sm leading-7">
        <p>
          The rate shown for a booking stays with that job. Later changes apply
          to eligible new bookings after your business accepts the new rule.
        </p>
        <p>
          If a customer pays your team directly, your business pays the
          commission to Servizato within {policy.collectionDays} days after the
          bill and payment are confirmed.
        </p>
        <p>
          If a customer pays online through Servizato, we record your amount
          after commission. A waiting payout is paid only when an admin records
          an actual transfer. Saving bank details does not move money.
        </p>
        <p>
          Verified customer refunds reverse the related commission in the same
          proportion. Any money already paid out or over-collected is shown
          separately for review.
        </p>
        <p>
          Please do not ask customers to cancel a Servizato booking to avoid
          commission. Reports are reviewed before any warning or account action.
        </p>
        <p>
          Keep payout details correct. Report a wrong bill, commission or
          payment through your account. Never share a bank password, UPI PIN or
          payment OTP.
        </p>
      </div>
      <p className="break-all text-xs text-muted-foreground">
        Rule {policy._id} · Terms {policy.termsVersion}
      </p>
      {!accepted && (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await mutation.mutateAsync({
                action: "accept_terms",
                policyId: policy._id,
                acknowledged: true,
              });
              toast.success(
                "Commission terms accepted for future eligible bookings.",
              );
            } catch (error) {
              toast.error(financeError(error));
            }
          }}
        >
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              required
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span>
              I have read this rule and accept it for my business’s eligible new
              bookings.
            </span>
          </label>
          <Button
            type="submit"
            disabled={!acknowledged || mutation.isPending}
            className="min-h-11"
          >
            {mutation.isPending ? "Saving…" : "Accept commission terms"}
          </Button>
        </form>
      )}
      <Link
        href="/service-provider/finance/settings"
        className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Review payout details
      </Link>
    </article>
  );
}
