"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Receipt, ShieldCheck } from "lucide-react";
import { useFinanceQuery, useFinanceAction } from "@/hooks/useFinance";
import { Button } from "@/components/ui/button";
import type { FinalBill } from "@/lib/finance-types";
import {
  FinanceState,
  financeMoney,
  financeError,
  paymentLabels,
  fieldClass,
} from "./FinanceUi";
export function FinalBillPanel({ invoiceId }: { invoiceId: string }) {
  const { data: session } = useSession(),
    query = useFinanceQuery<{ bill: FinalBill }>(
      `/finance/invoices/${invoiceId}`,
    ),
    mutation = useFinanceAction(`/finance/invoices/${invoiceId}`);
  const [mode, setMode] = useState("cash"),
    [collected, setCollected] = useState(false),
    [paidDirectly, setPaidDirectly] = useState(false),
    [reason, setReason] = useState(""),
    [problem, setProblem] = useState(false);
  const bill = query.data?.bill,
    customer = session?.user.role === "customer",
    team = ["technician", "service_provider", "admin"].includes(
      session?.user.role || "",
    );
  async function send(body: Record<string, unknown>) {
    try {
      await mutation.mutateAsync(body);
      toast.success(
        body.action === "dispute"
          ? "Your report is saved for review."
          : "Bill details saved.",
      );
      setProblem(false);
      setReason("");
    } catch (error) {
      toast.error(financeError(error));
    }
  }
  return (
    <section
      aria-label="Final bill confirmation"
      className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Receipt className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Final bill & payment</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Review the invoice and how the customer pays.
          </p>
        </div>
      </div>
      <FinanceState
        loading={query.isLoading}
        error={query.isError && !bill}
        retry={() => void query.refetch()}
      />
      {bill && (
        <>
          {query.isError && (
            <p
              role="status"
              className="text-xs text-amber-700 dark:text-amber-300"
            >
              Updates are delayed. Showing the last saved bill.
            </p>
          )}
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-muted/50 p-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Invoice {bill.invoiceNumber}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {financeMoney(bill.grossPaise)}
              </p>
            </div>
            <p className="rounded-full border border-border px-3 py-1 text-xs font-medium">
              {bill.billState.replaceAll("_", " ")}
            </p>
          </div>
          <dl className="space-y-2 text-sm">
            {bill.items.map((item, index) => (
              <div key={index} className="flex justify-between gap-4">
                <dt className="min-w-0 break-words text-muted-foreground">
                  {item.description} × {item.qty}
                </dt>
                <dd className="shrink-0">
                  {financeMoney(Math.round(item.amount * 100))}
                </dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2">
              <dt>Tax</dt>
              <dd>{financeMoney(Math.round(bill.taxAmount * 100))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Payment status</dt>
              <dd>{bill.paymentState.replaceAll("_", " ")}</dd>
            </div>
            {bill.paymentMode && (
              <div className="flex justify-between gap-3">
                <dt>Payment method</dt>
                <dd className="max-w-[60%] text-right">
                  {paymentLabels[bill.paymentMode]}
                </dd>
              </div>
            )}
            {bill.onlineReceivedPaise > 0 && (
              <div className="flex justify-between gap-3">
                <dt>Online funds received</dt>
                <dd>{financeMoney(bill.onlineReceivedPaise)}</dd>
              </div>
            )}
            {bill.billRefundedPaise > 0 && (
              <div className="flex justify-between gap-3">
                <dt>Bill refund recorded</dt>
                <dd>{financeMoney(bill.billRefundedPaise)}</dd>
              </div>
            )}
            {bill.extraRefundedPaise > 0 && (
              <div className="flex justify-between gap-3">
                <dt>Extra payment returned</dt>
                <dd>{financeMoney(bill.extraRefundedPaise)}</dd>
              </div>
            )}
            {bill.refundedPaise > 0 && (
              <div className="flex justify-between gap-3">
                <dt>Refund recorded</dt>
                <dd>{financeMoney(bill.refundedPaise)}</dd>
              </div>
            )}
          </dl>
          {bill.disputeReason && (
            <p
              role="status"
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
            >
              Under review: {bill.disputeReason}
            </p>
          )}
          {bill.reviewReason && (
            <p className="text-xs text-muted-foreground">
              Review note: {bill.reviewReason}
            </p>
          )}
          {team &&
            (["not_submitted", "pending"].includes(bill.billState) ||
              (bill.billState === "confirmed" &&
                bill.paymentState === "unpaid")) && (
              <form
                className="space-y-4 border-t border-border pt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send({
                    action: "submit",
                    invoiceVersion: bill.invoiceVersion,
                    paymentMode:
                      bill.paymentState === "paid" &&
                      bill.paymentMode === "servizato_online"
                        ? "servizato_online"
                        : mode,
                    collectedPaise:
                      mode !== "servizato_online" &&
                      collected &&
                      !(
                        bill.paymentState === "paid" &&
                        bill.paymentMode === "servizato_online"
                      )
                        ? bill.grossPaise
                        : 0,
                  });
                }}
              >
                <p className="text-sm font-semibold">
                  Submit the final bill for customer review
                </p>
                <label className="block space-y-2 text-sm">
                  <span>Payment method</span>
                  <select
                    value={
                      bill.paymentState === "paid" &&
                      bill.paymentMode === "servizato_online"
                        ? "servizato_online"
                        : mode
                    }
                    disabled={
                      mutation.isPending ||
                      (bill.paymentMode === "servizato_online" &&
                        bill.paymentState === "paid")
                    }
                    onChange={(event) => {
                      setMode(event.target.value);
                      setCollected(false);
                    }}
                    className={fieldClass}
                  >
                    {Object.entries(paymentLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {mode !== "servizato_online" &&
                  bill.paymentState !== "paid" && (
                    <label className="flex items-start gap-3 text-sm leading-6">
                      <input
                        type="checkbox"
                        checked={collected}
                        disabled={mutation.isPending}
                        onChange={(event) => setCollected(event.target.checked)}
                        className="mt-1 size-4 shrink-0 accent-primary"
                      />
                      <span>
                        Our team has collected the full{" "}
                        {financeMoney(bill.grossPaise)} directly from the
                        customer.
                      </span>
                    </label>
                  )}
                <p className="text-xs leading-6 text-muted-foreground">
                  Submitting a bill does not confirm payment. The customer
                  reviews direct-payment details. Razorpay confirms online
                  funds. Completed bill changes need an admin review.
                </p>
                <Button
                  type="submit"
                  disabled={mutation.isPending || query.isFetching}
                  className="min-h-11 w-full"
                >
                  {mutation.isPending
                    ? "Saving…"
                    : "Submit bill for confirmation"}
                </Button>
              </form>
            )}
          {customer && bill.billState === "pending" && (
            <div className="space-y-4 border-t border-border pt-5">
              {["cash", "direct_upi"].includes(bill.paymentMode || "") && (
                <label className="flex items-start gap-3 text-sm leading-6">
                  <input
                    type="checkbox"
                    checked={paidDirectly}
                    disabled={mutation.isPending}
                    onChange={(event) => setPaidDirectly(event.target.checked)}
                    className="mt-1 size-4 shrink-0 accent-primary"
                  />
                  <span>
                    I paid {financeMoney(bill.grossPaise)} directly to the
                    service team. Leave this unchecked if you have not paid.
                  </span>
                </label>
              )}
              <Button
                disabled={mutation.isPending || query.isFetching}
                className="min-h-11 w-full"
                onClick={() =>
                  void send({
                    action: "confirm",
                    invoiceVersion: bill.invoiceVersion,
                    grossPaise: bill.grossPaise,
                    paymentMode: bill.paymentMode,
                    directPaymentReceived:
                      ["cash", "direct_upi"].includes(bill.paymentMode || "") &&
                      paidDirectly,
                  })
                }
              >
                <ShieldCheck className="mr-2 size-4" />
                {mutation.isPending
                  ? "Saving…"
                  : "Confirm bill and payment details"}
              </Button>
              <p className="text-xs leading-6 text-muted-foreground">
                If your payment report differs from the service team’s report,
                the record goes for review. Confirming an online bill does not
                mark it paid.
              </p>
            </div>
          )}
          {customer && bill.billState === "not_submitted" && (
            <p className="text-sm text-muted-foreground">
              Your service team has not submitted the payment details yet. Your
              invoice and existing online checkout remain available.
            </p>
          )}
          {(customer || session?.user.role === "service_provider") && (
            <div>
              <Button
                variant="outline"
                className="min-h-11 w-full"
                disabled={mutation.isPending}
                onClick={() => setProblem((value) => !value)}
              >
                Report a problem
              </Button>
              {problem && (
                <form
                  className="mt-3 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send({
                      action: "dispute",
                      invoiceVersion: bill.invoiceVersion,
                      reason,
                    });
                  }}
                >
                  <label className="block space-y-2 text-sm">
                    <span>What looks wrong?</span>
                    <textarea
                      required
                      minLength={5}
                      maxLength={1000}
                      className={`${fieldClass} min-h-24`}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </label>
                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="min-h-11 w-full"
                  >
                    Send for review
                  </Button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
