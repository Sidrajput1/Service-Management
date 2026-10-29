"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Wallet, ArrowUpRight, ShieldCheck, RefreshCw } from "lucide-react";
import { useFinanceQuery, useFinanceAction } from "@/hooks/useFinance";
import { Button } from "@/components/ui/button";
import type {
  FinanceData,
  PayoutProfile,
  FinanceAudit,
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
import { CommissionTerms } from "./CommissionTerms";
import { FinalBillPanel } from "./FinalBillPanel";
export function ProviderFinanceWorkspace() {
  const [tab, setTab] = useState("earnings"),
    [cursor, setCursor] = useState(""),
    [selected, setSelected] = useState(""),
    [reason, setReason] = useState("");
  const query = useFinanceQuery<FinanceData>(
      `/service-provider/finance/ledger${cursor ? `?cursor=${cursor}` : ""}`,
    ),
    mutation = useFinanceAction("/service-provider/finance/ledger"),
    data = query.data;
  const [filter, setFilter] = useState("all");
  async function run(body: Record<string, unknown>) {
    try {
      await mutation.mutateAsync(body);
      toast.success(
        body.action === "create_collection_link"
          ? "Collection link prepared. Review it before paying."
          : "Financial record updated.",
      );
    } catch (error) {
      toast.error(financeError(error));
    }
  }
  const cards: [[string, string], ...[string, string][]] = [
    ["Recorded completed invoice value", "completedServicePaise"],
    ["Commission to pay Servizato", "commissionDuePaise"],
    ["Online earnings waiting for payout", "payoutWaitingPaise"],
    ["Provider payouts completed", "payoutPaidPaise"],
    ["Commission charged on confirmed jobs", "commissionEarnedPaise"],
    ["Under review", "underReviewPaise"],
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            YOUR BUSINESS ACCOUNT
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Earnings & Payments
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            See what your business owes, what Servizato owes your business, and
            what has actually been paid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Link
            href="/service-provider/finance/settings"
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium"
          >
            Payout details
          </Link>
        </div>
      </header>
      <FinanceState
        loading={query.isLoading}
        error={query.isError && !data}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          {query.isError && (
            <p
              role="status"
              className="text-sm text-amber-700 dark:text-amber-300"
            >
              Updates are delayed. Showing the last known financial records.
            </p>
          )}
          {data.setupWarning && (
            <p
              role="status"
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm leading-7"
            >
              The default commission rule is not set. Jobs without an agreed
              rule stay under review; no percentage is assumed. Existing
              customer payment and service completion remain available.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(([label, key]) => (
              <section
                key={key}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <Wallet className="mb-4 size-5 text-primary" />
                <p className="text-xs leading-5 text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {financeMoney(data.summary[key])}
                </p>
              </section>
            ))}
          </div>
          {(data.summary.providerRecoveryPaise > 0 ||
            data.summary.collectionCreditPaise > 0) && (
            <p className="rounded-2xl border border-amber-500/40 p-5 text-sm">
              A refund or adjustment needs a balance review. Payout recovery:{" "}
              {financeMoney(data.summary.providerRecoveryPaise)}. Commission
              over-collected: {financeMoney(data.summary.collectionCreditPaise)}
              . These amounts have not been silently offset.
            </p>
          )}
          {data.providerMetrics && (
            <section
              aria-label="Business service history"
              className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3"
            >
              <div>
                <p className="text-xs text-muted-foreground">Completed jobs</p>
                <p className="mt-2 text-xl font-semibold">
                  {data.providerMetrics.completedJobs}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Bookings from repeat requests
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {data.providerMetrics.repeatBookings}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Published customer rating
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {data.providerMetrics.ratingSummary?.count &&
                  Number.isFinite(data.providerMetrics.ratingSummary.average)
                    ? `${data.providerMetrics.ratingSummary.average.toFixed(1)} / 5 · ${data.providerMetrics.ratingSummary.count} reviews`
                    : "No published reviews yet"}
                </p>
              </div>
            </section>
          )}
          <nav
            aria-label="Financial sections"
            className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2"
          >
            {[
              ["earnings", "Job ledger"],
              ["collections", "Commission payments"],
              ["terms", "Commission terms"],
              ["history", "Payment history"],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={tab === value ? "default" : "ghost"}
                onClick={() => setTab(value)}
                className="min-h-11"
              >
                {label}
              </Button>
            ))}
          </nav>
          {tab === "earnings" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {data.total} prepared invoice records. Customer service value
                  is not Servizato revenue.
                </p>
                <label className="flex items-center gap-3 text-sm">
                  Show
                  <select
                    className={fieldClass}
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="all">All on this page</option>
                    <option value="cash">Cash</option>
                    <option value="direct_upi">Direct UPI</option>
                    <option value="servizato_online">Servizato online</option>
                  </select>
                </label>
              </div>
              <div className="space-y-4">
                {data.rows
                  .filter(
                    (row) => filter === "all" || row.paymentMode === filter,
                  )
                  .map((row) => (
                    <article
                      key={row._id}
                      className="rounded-2xl border border-border bg-card p-5"
                    >
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <h2 className="font-semibold">{row.invoiceNumber}</h2>
                          <Link
                            href={`/service-provider/finance/invoices/${row.invoiceId}`}
                            className="mt-2 inline-flex items-center gap-1 text-sm text-primary"
                          >
                            View invoice <ArrowUpRight className="size-3" />
                          </Link>
                          <p className="mt-2 break-all text-xs text-muted-foreground">
                            Job {row.jobId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {financeMoney(row.grossPaise)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {paymentLabels[row.paymentMode || ""] ||
                              "Payment method not submitted"}
                          </p>
                        </div>
                      </div>
                      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Agreed commission
                          </dt>
                          <dd className="mt-1">
                            {row.policyState === "ready"
                              ? `${(row.snapshot.rateBps || 0) / 100}% · ${financeMoney(row.commissionPaise)}`
                              : "Rule needs review"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Commission to pay
                          </dt>
                          <dd className="mt-1">
                            {financeMoney(row.commissionDuePaise)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Online payout waiting
                          </dt>
                          <dd className="mt-1">
                            {financeMoney(row.payoutWaitingPaise)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Bill / payment
                          </dt>
                          <dd className="mt-1">
                            {row.billState.replaceAll("_", " ")} /{" "}
                            {row.paymentState}
                          </dd>
                        </div>
                      </dl>
                      {row.dueAt && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          Commission due date: {financeDate(row.dueAt)}
                        </p>
                      )}
                      {row.disputeReason && (
                        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                          {row.disputeReason}
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setSelected(
                              selected === row.invoiceId ? "" : row.invoiceId,
                            )
                          }
                        >
                          Review bill & payment
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={mutation.isPending}
                          onClick={() => {
                            setSelected(`dispute:${row._id}`);
                            setReason("");
                          }}
                        >
                          Report a financial problem
                        </Button>
                      </div>
                      {selected === row.invoiceId && (
                        <div className="mt-5">
                          <FinalBillPanel invoiceId={row.invoiceId} />
                        </div>
                      )}
                      {selected === `dispute:${row._id}` && (
                        <form
                          className="mt-4 space-y-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run({
                              action: "dispute_ledger",
                              ledgerId: row._id,
                              reason,
                            });
                          }}
                        >
                          <label className="block space-y-2 text-sm">
                            <span>What needs review?</span>
                            <textarea
                              required
                              minLength={5}
                              maxLength={1000}
                              className={`${fieldClass} min-h-20`}
                              value={reason}
                              onChange={(event) =>
                                setReason(event.target.value)
                              }
                            />
                          </label>
                          <Button type="submit" disabled={mutation.isPending}>
                            Send for review
                          </Button>
                        </form>
                      )}
                    </article>
                  ))}
                {!data.rows.length && (
                  <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
                    No finance ledger entries yet. Completed invoices appear
                    after finance preparation; no earnings have been invented.
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
          {tab === "collections" && (
            <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-xl font-semibold">
                Commission to pay Servizato
              </h2>
              <p className="text-3xl font-semibold">
                {financeMoney(data.summary.commissionDuePaise)}
              </p>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                This is commission on confirmed direct-payment jobs. It is
                separate from money Servizato owes your business for online
                jobs. Payment Links collect into Servizato’s account and never
                pay out your earnings.
              </p>
              <Button
                disabled={
                  mutation.isPending || !data.summary.commissionDuePaise
                }
                onClick={() => void run({ action: "create_collection_link" })}
              >
                Prepare commission payment link
              </Button>
              <div className="space-y-3">
                {data.collections.map((link) => (
                  <div
                    key={link._id}
                    className="space-y-3 rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold">
                        {financeMoney(link.amountPaise)} · {link.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {financeDate(link.expiresAt)}
                      </p>
                    </div>
                    <p className="break-all text-xs text-muted-foreground">
                      Reference {link.reference}
                      {link.refundedPaise
                        ? ` · Refunded ${financeMoney(link.refundedPaise)}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {link.shortUrl && link.status === "active" && (
                        <a
                          href={link.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                        >
                          Review and pay commission
                        </a>
                      )}
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
                        Check payment status
                      </Button>
                      {link.status === "creating" && (
                        <Button
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            void run({ action: "create_collection_link" })
                          }
                        >
                          Retry saved link preparation
                        </Button>
                      )}
                    </div>
                    {link.status === "review" && (
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        This collection needs admin review. Do not pay again.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold">Reminder history</h3>
                {data.reminders.length ? (
                  data.reminders.map((reminder) => (
                    <p
                      key={reminder._id}
                      className="mt-3 text-sm text-muted-foreground"
                    >
                      Week of {reminder.week} ·{" "}
                      {financeMoney(reminder.amountPaise)} prepared
                      {reminder.deliveredAt
                        ? " · in-app reminder recorded"
                        : " · awaiting in-app delivery"}
                    </p>
                  ))
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No collection reminders prepared.
                  </p>
                )}
              </div>
            </section>
          )}
          {tab === "terms" && (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              {data.policies.map((policy) => (
                <CommissionTerms
                  key={policy._id}
                  policy={policy}
                  basis={data.basisLabel}
                  accepted={data.acceptances.some(
                    (a) =>
                      a.policyId === policy._id &&
                      a.termsVersion === policy.termsVersion,
                  )}
                />
              ))}
              {!data.policies.length && (
                <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  An admin needs to configure the commission rule. No percentage
                  is assumed.
                </p>
              )}
            </div>
          )}
          {tab === "history" && <AuditHistory events={data.events} />}
          <p className="text-xs leading-6 text-muted-foreground">
            Payouts are recorded manually after an actual transfer. Saving
            payout details does not transfer money. No automatic payout, email
            or WhatsApp reminder is enabled.
          </p>
        </>
      )}
    </div>
  );
}
export function ProviderPayoutSettings() {
  const { data: session } = useSession();
  return <PayoutSettingsForm key={session?.user.id || "anonymous"} />;
}
function PayoutSettingsForm() {
  const query = useFinanceQuery<{
      profile: PayoutProfile | null;
      history: FinanceAudit[];
      storageReady: boolean;
    }>("/service-provider/finance/payout-details"),
    mutation = useFinanceAction(
      "/service-provider/finance/payout-details",
      "put",
    );
  const [method, setMethod] = useState("bank"),
    [holder, setHolder] = useState(""),
    [account, setAccount] = useState(""),
    [ifsc, setIfsc] = useState(""),
    [bank, setBank] = useState(""),
    [upi, setUpi] = useState("");
  const data = query.data;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link
          href="/service-provider/finance/earnings"
          className="text-sm text-primary"
        >
          ← Earnings & Payments
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Payout details</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Save the account your business uses to receive approved payouts. Your
          technician’s personal account is not used automatically.
        </p>
      </header>
      <FinanceState
        loading={query.isLoading}
        error={query.isError && !data}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          {data.profile && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-primary" />
                <h2 className="font-semibold">Saved securely</h2>
              </div>
              <p className="mt-4 font-medium">{data.profile.masked}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.profile.bankName || "UPI"} ·{" "}
                {data.profile.status.replaceAll("_", " ")} · Version{" "}
                {data.profile.version}
              </p>
              {data.profile.reviewReason && (
                <p className="mt-3 text-sm">
                  Review note: {data.profile.reviewReason}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Updated {financeDate(data.profile.updatedAt)}. Admin review does
                not claim bank ownership verification.
              </p>
            </section>
          )}
          {!data.storageReady && (
            <p
              role="alert"
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm leading-7"
            >
              Secure payout storage is not configured yet. Ask the administrator
              to enable it. Full account details cannot be saved until then.
            </p>
          )}
          <form
            className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await mutation.mutateAsync({
                  method,
                  holderName: holder,
                  expectedVersion: data.profile?.version || 0,
                  ...(method === "bank"
                    ? {
                        accountNumber: account,
                        ifsc: ifsc.toUpperCase(),
                        bankName: bank,
                      }
                    : { upiId: upi.toLowerCase() }),
                });
                setHolder("");
                setAccount("");
                setIfsc("");
                setBank("");
                setUpi("");
                mutation.reset();
                toast.success(
                  "Payout details saved for review. No transfer was made.",
                );
              } catch (error) {
                toast.error(financeError(error));
              }
            }}
          >
            <h2 className="font-semibold">
              {data.profile ? "Update payout details" : "Add payout details"}
            </h2>
            <label className="block space-y-2 text-sm">
              <span>Preferred payout method</span>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className={fieldClass}
              >
                <option value="bank">Bank transfer</option>
                <option value="upi">UPI</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm">
              <span>Account holder name</span>
              <input
                autoComplete="off"
                required
                minLength={2}
                maxLength={120}
                value={holder}
                onChange={(event) => setHolder(event.target.value)}
                className={fieldClass}
              />
            </label>
            {method === "bank" ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2 text-sm sm:col-span-2">
                  <span>Bank account number</span>
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    required
                    pattern="[0-9]{9,18}"
                    value={account}
                    onChange={(event) => setAccount(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>IFSC code</span>
                  <input
                    autoComplete="off"
                    required
                    maxLength={11}
                    value={ifsc}
                    onChange={(event) =>
                      setIfsc(event.target.value.toUpperCase())
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Bank name</span>
                  <input
                    autoComplete="off"
                    required
                    minLength={2}
                    maxLength={100}
                    value={bank}
                    onChange={(event) => setBank(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
            ) : (
              <label className="block space-y-2 text-sm">
                <span>UPI ID</span>
                <input
                  autoComplete="off"
                  required
                  value={upi}
                  onChange={(event) => setUpi(event.target.value)}
                  placeholder="yourname@bank"
                  className={fieldClass}
                />
              </label>
            )}
            <p className="rounded-xl bg-muted/60 p-4 text-xs leading-6 text-muted-foreground">
              Never enter a UPI PIN, bank password, card CVV or payment OTP.
              Full payout details are encrypted, shown masked by default and
              opened by an admin only with an audit record.
            </p>
            <Button
              type="submit"
              disabled={
                mutation.isPending || query.isFetching || !data.storageReady
              }
              className="min-h-11"
            >
              {mutation.isPending
                ? "Saving securely…"
                : "Save for admin review"}
            </Button>
          </form>
          <AuditHistory events={data.history} />
        </>
      )}
    </div>
  );
}
