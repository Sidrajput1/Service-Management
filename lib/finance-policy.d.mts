export const commissionBasis: "invoice_before_tax";
export const financeTermsVersion: string;
export const basisLabel: string;
export function paise(value: unknown): number;
export function integerAmount(value: number): number;
export function sumPaise(values: number[]): number;
export function multiplyRate(amount: number, rateBps: number): number;
export function invoiceAmounts(invoice: {
  currency: string;
  grandTotal: number;
  taxAmount: number;
}): { grossPaise: number; eligiblePaise: number };
export interface PolicyChoice {
  _id: unknown;
  scope: "global" | "category" | "provider";
  scopeKey: string;
  effectiveAt: Date | string;
}
export function selectCommissionPolicy<T extends PolicyChoice>(
  policies: T[],
  providerId: unknown,
  categoryKey?: string,
  at?: Date,
): T | null;
export interface BalanceInput {
  grossPaise: number;
  commissionPaise?: number | null;
  refundedPaise?: number;
  commissionAdjustmentPaise?: number;
  payoutAdjustmentPaise?: number;
  collectedPaise?: number;
  payoutPaidPaise?: number;
  paymentMode?: string;
  billState: string;
  paymentState: string;
  policyState: string;
  jobCompleted: boolean;
  dueAt?: Date | string;
  onlineReceivedPaise?: number;
  unallocatedReceivedPaise?: number;
  unallocatedRefundedPaise?: number;
}
export interface LedgerBalances {
  ready: boolean;
  commissionEarnedPaise: number;
  commissionRetainedPaise: number;
  commissionCollectedPaise: number;
  commissionDuePaise: number;
  payoutWaitingPaise: number;
  payoutPaidPaise: number;
  providerRetainedPaise: number;
  providerRecoveryPaise: number;
  collectionCreditPaise: number;
  commissionReversedPaise: number;
  overdue: boolean;
  underReviewPaise: number;
}
export function ledgerBalances(row: BalanceInput, now?: Date): LedgerBalances;
export function financeSummary(
  rows: BalanceInput[],
  now?: Date,
): Record<string, number>;
export function weekKey(at?: Date): string;
export const cancellationReasons: Record<string, Record<string, string>>;
export function validCancellationReason(role: string, reason: string): boolean;
export function reminderText(amountPaise: number): string;
