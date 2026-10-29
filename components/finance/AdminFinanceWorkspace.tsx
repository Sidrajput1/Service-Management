"use client";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Wallet, ShieldCheck } from "lucide-react";
import { useFinanceQuery, useFinanceAction } from "@/hooks/useFinance";
import { Button } from "@/components/ui/button";
import type {
  FinanceData,
  FinanceRow,
  PayoutProfile,
  FinalBill,
} from "@/lib/finance-types";
import {
  FinanceState,
  financeMoney,
  financeDate,
  financeError,
  paymentLabels,
  fieldClass,
  AuditHistory,
} from "./FinanceUi";
import { FinalBillPanel } from "./FinalBillPanel";
import { CancellationPanel } from "./BookingActions";
import { reminderText } from "@/lib/finance-policy.mjs";

function amountInput(value: string) {
  const number = Number(value),
    result = Math.round(number * 100);
  if (!/^-?\d+(\.\d{1,2})?$/.test(value) || !Number.isSafeInteger(result))
    throw new Error("Use an amount with at most two decimal places.");
  return result;
}
function LedgerAction({
  row,
  profiles,
}: {
  row: FinanceRow;
  profiles: PayoutProfile[];
}) {
  const mutation = useFinanceAction("/admin/finance"),
    [action, setAction] = useState("review_bill"),
    [resolution, setResolution] = useState("request_confirmation"),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [amount, setAmount] = useState((row.payoutWaitingPaise / 100).toFixed(2)),
    [paidAt, setPaidAt] = useState(""),
    [acknowledged, setAcknowledged] = useState(false),
    [commissionDelta, setCommissionDelta] = useState("0");
  const profile = profiles.find((p) => p.providerId === row.providerId);
  const moneyAction = [
    "record_payout",
    "record_direct_refund",
    "record_manual_collection",
  ].includes(action);
  const maxAmount =
    action === "record_payout"
      ? row.payoutWaitingPaise
      : action === "record_direct_refund"
        ? row.grossPaise - row.refundedPaise
        : row.commissionDuePaise;
  return (
    <div className="space-y-5 border-t border-border pt-5">
      <FinalBillPanel invoiceId={row.invoiceId} />
      <form
        className="space-y-4 rounded-xl bg-muted/30 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const body: Record<string, unknown> = {
              action,
              ledgerId: row._id,
              reason,
            };
            if (action === "record_payout")
              Object.assign(body, {
                amountPaise: amountInput(amount),
                profileVersion: profile?.version,
                paidAt: new Date(paidAt).toISOString(),
                reference,
                acknowledged,
              });
            if (
              action === "record_direct_refund" ||
              action === "record_manual_collection"
            )
              Object.assign(body, {
                amountPaise: amountInput(amount),
                paidAt: new Date(paidAt).toISOString(),
                reference,
                acknowledged,
              });
            if (action === "review_bill")
              Object.assign(body, {
                resolution,
                ...(reference ? { reference } : {}),
              });
            if (action === "adjust_ledger")
              Object.assign(body, {
                commissionDeltaPaise: amountInput(commissionDelta),
                payoutDeltaPaise: 0,
              });
            await mutation.mutateAsync(body);
            toast.success("Audited finance action saved.");
            setReason("");
            setAcknowledged(false);
          } catch (error) {
            toast.error(financeError(error));
          }
        }}
      >
        <h3 className="font-semibold">Admin financial action</h3>
        <label className="block space-y-2 text-sm">
          <span>Action</span>
          <select
            value={action}
            onChange={(event) => {
              const next = event.target.value;
              setAction(next);
              setAcknowledged(false);
              setReference("");
              setAmount(
                (
                  (next === "record_direct_refund"
                    ? row.grossPaise - row.refundedPaise
                    : next === "record_manual_collection"
                      ? row.commissionDuePaise
                      : row.payoutWaitingPaise) / 100
                ).toFixed(2),
              );
            }}
            className={fieldClass}
          >
            <option value="review_bill">Review bill or payment</option>
            <option value="record_payout">
              Record a completed manual payout
            </option>
            <option value="adjust_ledger">
              Record a commission correction
            </option>
            <option value="record_manual_collection">
              Record commission actually received outside Razorpay
            </option>
            <option value="record_direct_refund">
              Record a customer refund already made by the business
            </option>
          </select>
        </label>
        {action === "review_bill" && (
          <>
            <label className="block space-y-2 text-sm">
              <span>Review outcome</span>
              <select
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                className={fieldClass}
              >
                <option value="request_confirmation">
                  Ask the customer to confirm again
                </option>
                <option value="verified_online">
                  Online payment verified; review complete
                </option>
                <option value="verified_direct">
                  Direct payment checked against evidence
                </option>
              </select>
            </label>
            {resolution === "verified_direct" && (
              <label className="block space-y-2 text-sm">
                <span>Evidence reference</span>
                <input
                  required
                  minLength={5}
                  maxLength={100}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className={fieldClass}
                />
              </label>
            )}
            <p className="text-xs leading-6 text-muted-foreground">
              An admin review is recorded as reviewed. It does not pretend that
              the customer approved the bill. Online payment still requires a
              verified gateway record.
            </p>
          </>
        )}
        {moneyAction && (
          <>
            <p className="rounded-xl border border-border p-4 text-sm">
              {action === "record_payout" ? (
                <>
                  Payout destination:{" "}
                  {profile
                    ? `${profile.masked} · ${profile.status.replaceAll("_", " ")} · version ${profile.version}`
                    : "No payout details saved"}
                  . This form records a transfer already made through your
                  approved banking process; it does not send money.
                </>
              ) : action === "record_direct_refund" ? (
                "Record the refund the business has actually returned to the customer. This form does not send a refund."
              ) : (
                "Record commission Servizato has actually received from this business. This is separate from a provider payout. Close any active payment link first."
              )}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span>Amount paid (₹)</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={maxAmount / 100}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Actual payment date and time</span>
                <input
                  required
                  type="datetime-local"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
            <label className="block space-y-2 text-sm">
              <span>Unique bank / UPI reference or cash receipt</span>
              <input
                required
                minLength={5}
                maxLength={100}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                required
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                {action === "record_payout"
                  ? "I checked the current payout details and confirm this transfer has actually completed."
                  : "I checked the receipt and confirm this money movement actually completed. I am recording it, not initiating it."}
              </span>
            </label>
          </>
        )}
        {action === "adjust_ledger" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span>Commission adjustment (₹, negative to reduce)</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={commissionDelta}
                  onChange={(event) => setCommissionDelta(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              This appends a commission correction with a reason. The provider
              balance changes by the opposite amount. The customer invoice and
              original agreed rate stay in the history. Separate fees or extra
              payout credits need an agreed funding rule.
            </p>
          </>
        )}
        <label className="block space-y-2 text-sm">
          <span>Reason for this action</span>
          <textarea
            required
            minLength={5}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={`${fieldClass} min-h-20`}
          />
        </label>
        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            (moneyAction && !acknowledged) ||
            (action === "record_payout" &&
              (!row.payoutWaitingPaise ||
                profile?.status !== "verified" ||
                !acknowledged))
          }
        >
          {mutation.isPending ? "Saving…" : "Save audited action"}
        </Button>
      </form>
      <InvoiceCorrection invoiceId={row.invoiceId} ledgerId={row._id} />
    </div>
  );
}
function InvoiceCorrection({
  invoiceId,
  ledgerId,
}: {
  invoiceId: string;
  ledgerId: string;
}) {
  const [open, setOpen] = useState(false),
    query = useFinanceQuery<{ bill: FinalBill }>(
      `/finance/invoices/${invoiceId}`,
      open,
    );
  return (
    <details
      className="rounded-xl border border-border p-4"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        Correct an unpaid bill with an audit record
      </summary>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        Corrections require new customer review. A bill with an existing
        payment, checkout reference, payout or collection cannot be rewritten
        here.
      </p>
      {open && query.data?.bill && (
        <CorrectionForm
          key={`${invoiceId}:${query.data.bill.invoiceVersion}`}
          bill={query.data.bill}
          ledgerId={ledgerId}
        />
      )}
    </details>
  );
}
function CorrectionForm({
  bill,
  ledgerId,
}: {
  bill: FinalBill;
  ledgerId: string;
}) {
  const mutation = useFinanceAction("/admin/finance"),
    [items, setItems] = useState(
      bill.items.map((item) => ({ ...item, taxable: item.taxable !== false })),
    ),
    [discount, setDiscount] = useState("0"),
    [tax, setTax] = useState(String(bill.taxPercent)),
    [reason, setReason] = useState("");
  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await mutation.mutateAsync({
            action: "correct_bill",
            ledgerId,
            reason,
            items: items.map(
              ({ itemType, description, qty, unitPrice, taxable }) => ({
                itemType,
                description,
                qty,
                unitPrice,
                taxable,
              }),
            ),
            discountAmount: Number(discount),
            taxPercent: Number(tax),
          });
          toast.success(
            "Correction saved. The customer must review the new bill.",
          );
        } catch (error) {
          toast.error(financeError(error));
        }
      }}
    >
      {items.map((item, index) => (
        <fieldset
          key={index}
          className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"
        >
          <legend className="px-2 text-xs">Invoice line {index + 1}</legend>
          <label className="space-y-1 text-xs">
            <span>Description</span>
            <input
              required
              className={fieldClass}
              value={item.description}
              onChange={(event) =>
                setItems((values) =>
                  values.map((v, i) =>
                    i === index ? { ...v, description: event.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label className="space-y-1 text-xs">
            <span>Line type</span>
            <select
              className={fieldClass}
              value={item.itemType}
              onChange={(event) =>
                setItems((values) =>
                  values.map((v, i) =>
                    i === index ? { ...v, itemType: event.target.value } : v,
                  ),
                )
              }
            >
              {["service", "part", "visit", "other"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span>Quantity</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className={fieldClass}
              value={item.qty}
              onChange={(event) =>
                setItems((values) =>
                  values.map((v, i) =>
                    i === index ? { ...v, qty: Number(event.target.value) } : v,
                  ),
                )
              }
            />
          </label>
          <label className="space-y-1 text-xs">
            <span>Unit price (₹)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className={fieldClass}
              value={item.unitPrice}
              onChange={(event) =>
                setItems((values) =>
                  values.map((v, i) =>
                    i === index
                      ? { ...v, unitPrice: Number(event.target.value) }
                      : v,
                  ),
                )
              }
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setItems((values) => values.filter((_, i) => i !== index))
            }
            disabled={items.length === 1}
          >
            Remove line
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setItems((values) => [
            ...values,
            {
              itemType: "other",
              description: "",
              qty: 1,
              unitPrice: 0,
              amount: 0,
              taxable: true,
            },
          ])
        }
      >
        Add invoice line
      </Button>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Additional discount from these line amounts (₹)</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Tax percentage</span>
          <input
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={tax}
            onChange={(event) => setTax(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Existing line prices already include booking discounts. Enter only an
        additional discount here. Review the resulting bill before asking the
        customer to confirm.
      </p>
      <label className="block space-y-2 text-sm">
        <span>Correction reason</span>
        <textarea
          required
          minLength={5}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${fieldClass} min-h-20`}
        />
      </label>
      <Button type="submit" disabled={mutation.isPending}>
        Save correction for customer review
      </Button>
    </form>
  );
}
function PayoutReview({ profile }: { profile: PayoutProfile }) {
  const mutation = useFinanceAction<{ payoutDetails?: Record<string, string> }>(
      "/admin/finance",
    ),
    [reason, setReason] = useState(""),
    [details, setDetails] = useState<Record<string, string> | null>(null);
  async function run(action: string, status?: string) {
    try {
      const result = await mutation.mutateAsync({
        action,
        providerId: profile.providerId,
        reason,
        ...(status ? { status, expectedVersion: profile.version } : {}),
      });
      if (result.payoutDetails) setDetails(result.payoutDetails);
      else {
        setDetails(null);
        mutation.reset();
      }
      toast.success(
        action === "reveal_payout"
          ? "Access recorded in the audit history."
          : "Payout detail review saved.",
      );
    } catch (error) {
      toast.error(financeError(error));
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">{profile.masked}</h3>
      <p className="break-all text-xs text-muted-foreground">
        Business {profile.providerId} · {profile.method} · version{" "}
        {profile.version} · {profile.status.replaceAll("_", " ")}
      </p>
      <label className="block space-y-2 text-sm">
        <span>Reason for opening or reviewing these details</span>
        <textarea
          minLength={5}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${fieldClass} min-h-20`}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={mutation.isPending || reason.trim().length < 5}
          onClick={() => void run("reveal_payout")}
        >
          Open necessary payout details
        </Button>
        <Button
          disabled={mutation.isPending || reason.trim().length < 5}
          onClick={() => void run("review_payout", "verified")}
        >
          Mark admin review complete
        </Button>
        <Button
          variant="outline"
          disabled={mutation.isPending || reason.trim().length < 5}
          onClick={() => void run("review_payout", "changes_requested")}
        >
          Ask provider to correct details
        </Button>
      </div>
      {details && (
        <div className="space-y-3 rounded-xl border border-amber-500/40 p-4">
          <p className="text-xs text-muted-foreground">
            Opened for this review. Close these details when finished.
          </p>
          <dl className="space-y-2 text-sm">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="grid gap-1 sm:grid-cols-2">
                <dt className="text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1")}
                </dt>
                <dd className="break-all font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <Button
            variant="outline"
            onClick={() => {
              setDetails(null);
              mutation.reset();
            }}
          >
            Close details
          </Button>
        </div>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        Admin review does not claim bank ownership verification. Saving or
        approving these details does not transfer funds.
      </p>
    </section>
  );
}
export function AdminFinanceWorkspace() {
  const [tab, setTab] = useState("ledger"),
    [filters, setFilters] = useState(""),
    [cursor, setCursor] = useState(""),
    [selected, setSelected] = useState(""),
    [booking, setBooking] = useState(""),
    [openedBooking, setOpenedBooking] = useState("");
  const query = useFinanceQuery<FinanceData>(
      `/admin/finance?${filters}${cursor ? `&cursor=${cursor}` : ""}`,
    ),
    mutation = useFinanceAction("/admin/finance"),
    data = query.data;
  const [scope, setScope] = useState("global"),
    [scopeKey, setScopeKey] = useState(""),
    [rate, setRate] = useState(""),
    [effective, setEffective] = useState(""),
    [days, setDays] = useState("7"),
    [policyReason, setPolicyReason] = useState(""),
    [reviewReason, setReviewReason] = useState(""),
    [reviewStatus, setReviewStatus] = useState("under_review");
  async function run(body: Record<string, unknown>) {
    try {
      await mutation.mutateAsync(body);
      toast.success("Financial action saved.");
    } catch (error) {
      toast.error(financeError(error));
    }
  }
  const providerName = (id: string) =>
    data?.providers.find((row) => row._id === id)?.companyName || id;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            SERVIZATO FINANCE
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Commission, collections & payouts
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Review bill approval, verified funds and business balances
            separately. Service value is not platform revenue.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </header>
      <FinanceState
        loading={query.isLoading}
        error={query.isError && !data}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          {!data.financeSetupReady && (
            <p
              role="alert"
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm"
            >
              Finance writes need deployment setup. Ask the server administrator
              to run the documented finance index preflight and installer before
              entering financial records.
            </p>
          )}
          {data.setupWarning && (
            <div
              role="status"
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm leading-7"
            >
              Set the default commission rule before new commission calculations
              can be finalized. No rate is assumed. Existing unconfigured or
              historical records remain under review.
            </div>
          )}
          {query.isError && (
            <p
              role="status"
              className="text-sm text-amber-700 dark:text-amber-300"
            >
              Updates are delayed. Showing the last known records.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Completed invoice value", "completedServicePaise"],
              ["Commission earned", "commissionEarnedPaise"],
              [
                "Commission collected from businesses",
                "commissionCollectedPaise",
              ],
              [
                "Commission retained from online funds",
                "commissionRetainedPaise",
              ],
              ["Commission still due", "commissionDuePaise"],
              ["Customer online funds received", "onlineReceivedPaise"],
              ["Provider payouts waiting", "payoutWaitingPaise"],
              ["Provider payouts completed", "payoutPaidPaise"],
              ["Overdue commission", "overduePaise"],
              ["Under review", "underReviewPaise"],
              ["Refunds recorded", "refundedPaise"],
              ["Payout recovery for review", "providerRecoveryPaise"],
            ].map(([label, key]) => (
              <section
                key={key}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <Wallet className="mb-3 size-4 text-primary" />
                <p className="text-xs leading-5 text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {financeMoney(data.summary[key])}
                </p>
              </section>
            ))}
          </div>
          <form
            className="grid items-end gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget),
                params = new URLSearchParams();
              for (const [key, value] of form.entries())
                if (String(value)) params.set(key, String(value));
              setFilters(params.toString());
              setCursor("");
            }}
          >
            <label className="space-y-2 text-xs">
              <span>Business</span>
              <select name="providerId" className={fieldClass}>
                <option value="">All businesses</option>
                {data.providers.map((row) => (
                  <option key={row._id} value={row._id}>
                    {row.companyName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs">
              <span>Job reference</span>
              <input name="jobId" maxLength={24} className={fieldClass} />
            </label>
            <label className="space-y-2 text-xs">
              <span>Payment method</span>
              <select name="paymentMode" className={fieldClass}>
                <option value="">All methods</option>
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs">
              <span>Status</span>
              <select name="status" className={fieldClass}>
                {[
                  ["", "All records"],
                  ["pending", "Bill waiting"],
                  ["disputed", "Under dispute"],
                  ["setup_needed", "Commission setup needed"],
                  ["due", "Commission due"],
                  ["overdue", "Commission overdue"],
                  ["payout_waiting", "Payout waiting"],
                  ["refunded", "Refund recorded"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs">
              <span>From date</span>
              <input type="date" name="from" className={fieldClass} />
            </label>
            <label className="space-y-2 text-xs">
              <span>Through date</span>
              <input type="date" name="to" className={fieldClass} />
            </label>
            <Button type="submit">Apply filters</Button>
          </form>
          <nav
            aria-label="Finance management"
            className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2"
          >
            {[
              ["ledger", "Job ledger"],
              ["rules", "Commission rules"],
              ["collections", "Weekly collections"],
              ["payouts", "Payout detail reviews"],
              ["cancellations", "Cancellation reviews"],
              ["history", "Audit history"],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={tab === value ? "default" : "ghost"}
                onClick={() => {
                  setTab(value);
                  setSelected("");
                }}
              >
                {label}
              </Button>
            ))}
          </nav>
          {tab === "ledger" && (
            <>
              <p className="text-sm text-muted-foreground">
                {data.total} matching prepared invoices. Amounts are never
                silently offset between businesses or money flows.
              </p>
              <div className="space-y-4">
                {data.rows.map((row) => (
                  <article
                    key={row._id}
                    className="space-y-4 rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">
                          {row.invoiceNumber} · {providerName(row.providerId)}
                        </h2>
                        <p className="mt-2 break-all text-xs text-muted-foreground">
                          Job {row.jobId} · Record {row._id}
                        </p>
                      </div>
                      <p className="text-xl font-semibold">
                        {financeMoney(row.grossPaise)}
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <p>
                        Rate:{" "}
                        {row.policyState === "ready"
                          ? `${(row.snapshot.rateBps || 0) / 100}%`
                          : `${row.policyState.replaceAll("_", " ")}`}
                      </p>
                      <p>
                        Commission due: {financeMoney(row.commissionDuePaise)}
                      </p>
                      <p>
                        Payout waiting: {financeMoney(row.payoutWaitingPaise)}
                      </p>
                      <p>
                        {row.billState.replaceAll("_", " ")} /{" "}
                        {row.paymentState}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {paymentLabels[row.paymentMode || ""] ||
                        "Method not submitted"}{" "}
                      · Rate rule{" "}
                      {row.snapshot.policyId || "not established before work"}
                      {row.dueAt ? ` · Due ${financeDate(row.dueAt)}` : ""}
                    </p>
                    {row.disputeReason && (
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {row.disputeReason}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() =>
                        setSelected(selected === row._id ? "" : row._id)
                      }
                    >
                      Review financial record
                    </Button>
                    {selected === row._id && (
                      <LedgerAction row={row} profiles={data.profiles} />
                    )}
                  </article>
                ))}
                {!data.rows.length && (
                  <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
                    No matching prepared financial records. Use the documented
                    preparation command for older invoices; it never invents
                    historical commission terms.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {cursor && (
                  <Button variant="outline" onClick={() => setCursor("")}>
                    First page
                  </Button>
                )}
                {data.nextCursor && (
                  <Button
                    variant="outline"
                    onClick={() => setCursor(data.nextCursor!)}
                  >
                    Older records
                  </Button>
                )}
              </div>
            </>
          )}
          {tab === "rules" && (
            <div className="grid items-start gap-6 xl:grid-cols-2">
              <form
                className="space-y-4 rounded-2xl border border-border bg-card p-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    const rateBps = amountInput(rate);
                    await mutation.mutateAsync({
                      action: "create_policy",
                      scope,
                      scopeKey: scope === "global" ? "global" : scopeKey,
                      rateBps,
                      effectiveAt: new Date(effective).toISOString(),
                      collectionDays: Number(days),
                      reason: policyReason,
                    });
                    setRate("");
                    setPolicyReason("");
                    toast.success(
                      "Rule version saved. Providers must accept it before it applies to eligible new bookings.",
                    );
                  } catch (error) {
                    toast.error(financeError(error));
                  }
                }}
              >
                <h2 className="text-xl font-semibold">
                  Add a commission rule version
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  Priority: business rule, category rule, default. Existing
                  booking snapshots stay unchanged. Basis: {data.basisLabel}.
                </p>
                <label className="block space-y-2 text-sm">
                  <span>Rule applies to</span>
                  <select
                    value={scope}
                    onChange={(event) => {
                      setScope(event.target.value);
                      setScopeKey("");
                    }}
                    className={fieldClass}
                  >
                    <option value="global">Global default</option>
                    <option value="category">Service category</option>
                    <option value="provider">One provider business</option>
                  </select>
                </label>
                {scope !== "global" && (
                  <label className="block space-y-2 text-sm">
                    <span>
                      {scope === "provider" ? "Business" : "Category"}
                    </span>
                    <select
                      required
                      value={scopeKey}
                      onChange={(event) => setScopeKey(event.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Choose {scope}</option>
                      {scope === "provider"
                        ? data.providers.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.companyName}
                            </option>
                          ))
                        : data.categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                    </select>
                  </label>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>Commission percentage</span>
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={rate}
                      onChange={(event) => setRate(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Direct-payment collection due in days</span>
                    <input
                      required
                      type="number"
                      min="1"
                      max="90"
                      value={days}
                      onChange={(event) => setDays(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <label className="block space-y-2 text-sm">
                  <span>Applies from</span>
                  <input
                    required
                    type="datetime-local"
                    value={effective}
                    onChange={(event) => setEffective(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Reason for the new rule</span>
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    value={policyReason}
                    onChange={(event) => setPolicyReason(event.target.value)}
                    className={`${fieldClass} min-h-20`}
                  />
                </label>
                <Button type="submit" disabled={mutation.isPending}>
                  Save rule version
                </Button>
              </form>
              <div className="space-y-4">
                {data.policies.map((policy) => (
                  <article
                    key={policy._id}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <p className="font-semibold">
                      {policy.rateBps / 100}% · {policy.scope}{" "}
                      {policy.scope !== "global" ? policy.scopeKey : ""}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      From {financeDate(policy.effectiveAt)} · collection in{" "}
                      {policy.collectionDays} days
                    </p>
                    <p className="mt-2 text-sm">{policy.reason}</p>
                    <p className="mt-3 break-all text-xs text-muted-foreground">
                      Rule {policy._id} · {policy.termsVersion}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
          {tab === "collections" && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-xl font-semibold">
                  Weekly collection work
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Prepare one in-app reminder per business each week for
                  overdue, confirmed dues. Disputed amounts are excluded. Email
                  and WhatsApp are not sent.
                </p>
                <Button
                  className="mt-4"
                  disabled={mutation.isPending}
                  onClick={() => void run({ action: "prepare_reminders" })}
                >
                  Prepare this week’s in-app reminders
                </Button>
              </div>
              {data.collectionWork.map((work) => (
                <article
                  key={work.providerId}
                  className="space-y-4 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="font-semibold">
                    {providerName(work.providerId)}
                  </h3>
                  <p className="text-2xl font-semibold">
                    {financeMoney(work.amountPaise)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Oldest due {financeDate(work.oldestDueAt)} · overdue{" "}
                    {financeMoney(work.overduePaise)} · last reminder{" "}
                    {financeDate(work.lastReminderAt)}
                  </p>
                  <textarea
                    readOnly
                    aria-label={`Reminder for ${providerName(work.providerId)}`}
                    className={`${fieldClass} min-h-24`}
                    value={reminderText(work.amountPaise)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={mutation.isPending}
                      onClick={() =>
                        void run({
                          action: "create_collection_link",
                          providerId: work.providerId,
                        })
                      }
                    >
                      Prepare / reuse payment link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            reminderText(work.amountPaise),
                          );
                          toast.success(
                            "Reminder copied. No message was sent.",
                          );
                        } catch {
                          toast.error(
                            "Copy the reminder text from the box above.",
                          );
                        }
                      }}
                    >
                      Copy reminder
                    </Button>
                  </div>
                </article>
              ))}
              {data.collections.map((link) => (
                <article
                  key={link._id}
                  className="space-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="font-semibold">
                    {providerName(link.providerId)} ·{" "}
                    {financeMoney(link.amountPaise)} · {link.status}
                  </h3>
                  <p className="break-all text-xs text-muted-foreground">
                    {link.reference} · expires {financeDate(link.expiresAt)}
                    {link.refundedPaise
                      ? ` · refunded ${financeMoney(link.refundedPaise)}`
                      : ""}
                  </p>
                  {link.shortUrl && (
                    <p className="break-all text-sm">
                      Saved link:{" "}
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {link.shortUrl}
                      </a>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() =>
                        void run({
                          action: "reconcile_collection",
                          collectionId: link._id,
                        })
                      }
                    >
                      Verify / reconcile payment
                    </Button>
                    {["creating", "active", "review"].includes(link.status) && (
                      <div className="w-full space-y-3">
                        <label className="block space-y-2 text-sm">
                          <span>Reason to cancel this outstanding link</span>
                          <input
                            minLength={5}
                            maxLength={1000}
                            className={fieldClass}
                            value={selected === link._id ? reviewReason : ""}
                            onChange={(event) => {
                              setSelected(link._id);
                              setReviewReason(event.target.value);
                            }}
                          />
                        </label>
                        <Button
                          variant="outline"
                          disabled={
                            mutation.isPending ||
                            selected !== link._id ||
                            reviewReason.trim().length < 5
                          }
                          onClick={() =>
                            void run({
                              action: "cancel_collection_link",
                              collectionId: link._id,
                              reason: reviewReason,
                            })
                          }
                        >
                          Cancel outstanding link
                        </Button>
                      </div>
                    )}
                  </div>
                  {link.status === "review" && (
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Payment or its allocation needs review. No disputed
                      balance is silently settled.
                    </p>
                  )}
                </article>
              ))}
            </section>
          )}
          {tab === "payouts" && (
            <div className="space-y-5">
              <p className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm leading-7">
                <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
                Payout details are masked by default. Opening them requires a
                reason and records admin access. Review the latest version
                before recording an actual payout against an online job.
              </p>
              {!data.payoutStorageReady && (
                <p
                  role="status"
                  className="text-sm text-amber-700 dark:text-amber-300"
                >
                  The server payout encryption key needs configuration.
                </p>
              )}
              {data.profiles.map((profile) => (
                <PayoutReview
                  key={`${profile._id}:${profile.version}`}
                  profile={profile}
                />
              ))}
              {!data.profiles.length && (
                <p className="text-sm text-muted-foreground">
                  No provider payout details saved.
                </p>
              )}
            </div>
          )}
          {tab === "cancellations" && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-xl font-semibold">Cancellation review</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  A report is a request for review, not proof of misconduct.
                  Review the actor, saved status, reason and customer feedback.
                  No commission debt is created from an accusation.
                </p>
                <form
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (/^[a-f\d]{24}$/i.test(booking))
                      setOpenedBooking(booking);
                    else toast.error("Enter a valid booking reference.");
                  }}
                >
                  <label className="grow text-sm">
                    <span className="sr-only">Booking reference to cancel</span>
                    <input
                      value={booking}
                      onChange={(event) => setBooking(event.target.value)}
                      placeholder="Booking reference"
                      className={fieldClass}
                    />
                  </label>
                  <Button type="submit">Review booking cancellation</Button>
                </form>
                {openedBooking && (
                  <div className="mt-4">
                    <CancellationPanel bookingId={openedBooking} />
                  </div>
                )}
              </div>
              {data.cancellations.map((record) => (
                <article
                  key={record._id}
                  className="space-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="font-semibold">
                    {providerName(record.providerId)} ·{" "}
                    {record.reviewStatus.replaceAll("_", " ")}
                  </h3>
                  <p className="break-all text-xs text-muted-foreground">
                    Booking {record.bookingId}
                    {record.jobId ? ` · Job ${record.jobId}` : ""}
                  </p>
                  <p className="text-sm">
                    Cancelled by {record.actorRole.replaceAll("_", " ")} ·{" "}
                    {financeDate(record.cancelledAt)}
                  </p>
                  <p className="text-sm">
                    Previous state: {record.previousBookingStatus} /{" "}
                    {record.previousJobStatus || "No job assigned"}
                  </p>
                  <p className="text-sm">
                    Reason: {record.reason.replaceAll("_", " ")}
                    {record.note ? ` · ${record.note}` : ""}
                  </p>
                  <p className="text-sm">
                    Customer report:{" "}
                    {record.feedback?.replaceAll("_", " ") || "No response"}
                    {record.feedbackNote ? ` · ${record.feedbackNote}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recent queue:{" "}
                    {
                      data.cancellations.filter(
                        (item) => item.providerId === record.providerId,
                      ).length
                    }{" "}
                    cancellations for this business;{" "}
                    {
                      data.cancellations.filter(
                        (item) =>
                          item.providerId === record.providerId &&
                          ["enroute", "arrived"].includes(
                            item.previousJobStatus || "",
                          ),
                      ).length
                    }{" "}
                    after travel or arrival. These are review signals, not a
                    misconduct finding.
                  </p>
                  {record.jobId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters(
                          new URLSearchParams({
                            jobId: record.jobId!,
                          }).toString(),
                        );
                        setTab("ledger");
                        setCursor("");
                      }}
                    >
                      Open related financial review
                    </Button>
                  )}
                  {record.reviewReason && (
                    <p className="text-sm text-muted-foreground">
                      Last review: {record.reviewReason}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(selected === record._id ? "" : record._id);
                      setReviewReason("");
                    }}
                  >
                    Record review outcome
                  </Button>
                  {selected === record._id && (
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void run({
                          action: "review_cancellation",
                          caseId: record._id,
                          status: reviewStatus,
                          reason: reviewReason,
                        });
                      }}
                    >
                      <label className="block space-y-2 text-sm">
                        <span>Review status</span>
                        <select
                          value={reviewStatus}
                          onChange={(event) =>
                            setReviewStatus(event.target.value)
                          }
                          className={fieldClass}
                        >
                          {[
                            ["open", "Open"],
                            ["under_review", "Under review"],
                            ["no_issue", "Reviewed — no issue found"],
                            ["confirmed_issue", "Confirmed issue"],
                            ["action_taken", "Action taken"],
                          ].map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-2 text-sm">
                        <span>Reason and supporting evidence</span>
                        <textarea
                          required
                          minLength={5}
                          maxLength={1000}
                          value={reviewReason}
                          onChange={(event) =>
                            setReviewReason(event.target.value)
                          }
                          className={`${fieldClass} min-h-20`}
                        />
                      </label>
                      <Button type="submit" disabled={mutation.isPending}>
                        Save audited review
                      </Button>
                    </form>
                  )}
                </article>
              ))}
            </section>
          )}
          {tab === "history" && <AuditHistory events={data.events} />}
          <p className="text-xs leading-6 text-muted-foreground">
            No automatic bank transfer or refund is initiated here. Existing
            Razorpay customer payments stay in Servizato’s account. Payouts
            require your approved manual banking process.
          </p>
        </>
      )}
    </div>
  );
}
