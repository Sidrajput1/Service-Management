export interface FinancePolicy {
  _id: string;
  scope: "global" | "category" | "provider";
  scopeKey: string;
  rateBps: number;
  basis: string;
  effectiveAt: string;
  collectionDays: number;
  termsVersion: string;
  reason: string;
  createdAt: string;
}
export interface FinanceRow {
  _id: string;
  invoiceId: string;
  invoiceNumber: string;
  jobId: string;
  bookingId: string;
  providerId: string;
  grossPaise: number;
  eligiblePaise: number;
  commissionPaise?: number;
  policyState: string;
  snapshot: {
    rateBps?: number;
    policyId?: string;
    basis?: string;
    termsVersion?: string;
  };
  billState: string;
  paymentState: string;
  paymentMode?: string;
  dueAt?: string;
  commissionDuePaise: number;
  commissionEarnedPaise: number;
  payoutWaitingPaise: number;
  payoutPaidPaise: number;
  refundedPaise: number;
  providerRecoveryPaise: number;
  collectionCreditPaise: number;
  commissionAdjustmentPaise: number;
  payoutAdjustmentPaise: number;
  disputeReason?: string;
  reviewReason?: string;
  invoiceVersion: number;
}
export interface PayoutProfile {
  _id: string;
  providerId: string;
  method: "bank" | "upi";
  bankName?: string;
  masked: string;
  version: number;
  status: string;
  reviewReason?: string;
  updatedAt: string;
}
export interface FinanceAudit {
  _id: string;
  kind: string;
  actorRole: string;
  actorId?: string;
  ledgerId?: string;
  resourceId?: string;
  amountPaise?: number;
  reason?: string;
  reference?: string;
  paidAt?: string;
  createdAt: string;
  policy?: { old: unknown; new: unknown };
}
export interface CollectionLink {
  _id: string;
  providerId: string;
  amountPaise: number;
  status: string;
  shortUrl?: string;
  gatewayPaymentId?: string;
  expiresAt: string;
  paidAt?: string;
  refundedPaise: number;
  activeKey?: string;
  reference: string;
}
export interface CancellationReview {
  _id: string;
  bookingId: string;
  jobId?: string;
  providerId: string;
  actorRole: string;
  reason: string;
  note?: string;
  previousBookingStatus: string;
  previousJobStatus?: string;
  cancelledAt: string;
  feedback?: string;
  feedbackNote?: string;
  reviewStatus: string;
  reviewReason?: string;
}
export interface FinanceData {
  providerMetrics?: {
    completedJobs: number;
    repeatBookings: number;
    ratingSummary?: { average: number; count: number };
  };
  summary: Record<string, number>;
  rows: FinanceRow[];
  total: number;
  nextCursor: string | null;
  policies: FinancePolicy[];
  acceptances: { policyId: string; acceptedAt: string; termsVersion: string }[];
  profiles: PayoutProfile[];
  collections: CollectionLink[];
  reminders: {
    _id: string;
    providerId: string;
    week: string;
    amountPaise: number;
    createdAt: string;
    deliveredAt?: string;
  }[];
  cancellations: CancellationReview[];
  events: FinanceAudit[];
  providers: {
    _id: string;
    companyName: string;
    ratingSummary?: { average: number; count: number };
  }[];
  categories: string[];
  collectionWork: {
    providerId: string;
    amountPaise: number;
    overduePaise: number;
    oldestDueAt?: string;
    lastReminderAt?: string;
    activeCollectionId?: string;
  }[];
  basisLabel: string;
  termsVersion: string;
  payoutStorageReady: boolean;
  setupWarning: boolean;
  manualPayoutsOnly: boolean;
  financeSetupReady: boolean;
}
export interface FinalBill {
  invoiceId: string;
  invoiceNumber: string;
  jobId: string;
  bookingId: string;
  jobStatus: string;
  currency: string;
  items: {
    itemType: string;
    description: string;
    qty: number;
    unitPrice: number;
    amount: number;
    taxable?: boolean;
  }[];
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  invoiceStatus: string;
  invoiceVersion: number;
  grossPaise: number;
  billState: string;
  paymentMode?: string;
  paymentState: string;
  claimedCollectedPaise: number;
  confirmedAt?: string;
  submittedAt?: string;
  disputeReason?: string;
  reviewReason?: string;
  refundedPaise: number;
  onlineReceivedPaise: number;
  billRefundedPaise: number;
  extraRefundedPaise: number;
}
export interface CommissionPreview {
  policy: FinancePolicy | null;
  accepted: boolean;
  basisLabel: string;
}
