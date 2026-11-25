import type { Address } from "@/lib/customer-types";
import type { QuoteLine, QuoteStatus } from "@/models/job-quote";

export interface TechnicianWorkflowCapabilities {
  access: "active" | "read_only";
  reason?: string;
  canAccept: boolean;
  canArrive: boolean;
  canStart: boolean;
  canUploadProof: boolean;
  canManageParts: boolean;
  canComplete: boolean;
  canRetryInvoice: boolean;
}
export interface TechnicianJourney {
  canTrack: boolean;
  destinationAvailable: boolean;
  clientIntervalMs: number;
  requiredReadings: number;
  radiusMeters: number;
}
export interface TechnicianJobProof {
  _id: string;
  url?: string;
  thumbnailUrl?: string;
  type?: string;
  metadata?: { note?: string; public_id?: string };
  createdAt?: string;
}
export interface TechnicianJobPart {
  partId?: string;
  source?: "on_site";
  note?: string;
  partName: string;
  qty: number;
  price?: number;
}
export interface TechnicianBookingSnapshot {
  paymentMethod?: string;
  _id: string;
  serviceType?: string;
  subService?: string;
  customerId?: { _id?: string; name?: string; phone?: string } | null;
  address?: Address;
  status?: string;
  scheduledAt?: string;
  timeWindow?: { from?: string; to?: string };
  technicianId?: string | null;
  estimatedPrice?: number;
  notes?: string;
  pricing?: {
    finalPrice?: number;
    taxPercent?: number;
    quantity?: number;
    unit?: string;
    pricingModel?: string;
  };
}
export interface TechnicianJob {
  _id: string;
  status: string;
  bookingId?: TechnicianBookingSnapshot | null;
  technicianId?: string | null;
  scheduledAt?: string;
  scheduledEndAt?: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  arrivalMethod?: "manual" | "automatic";
  customerOtpVerifiedAt?: string;
  startTime?: string;
  proofSubmittedAt?: string;
  endTime?: string;
  proofRequired?: boolean;
  proofIds?: Array<TechnicianJobProof | string>;
  partsUsed?: TechnicianJobPart[];
  partsVersion?: number;
  notes?: string;
  paymentStatus?: string;
  paymentReceivedAt?: string;
  paymentMethod?: string;
  invoiceId?: string | { _id: string; invoiceNumber?: string } | null;
}
export interface TechnicianJobDetailResponse {
  runningBill?: import("./job-running-bill").RunningBill | null;
  job: TechnicianJob;
  journey?: TechnicianJourney;
  workflow?: TechnicianWorkflowCapabilities;
  verificationIssue?: "locked" | "expired" | "unavailable" | "used" | null;
  quoteStatus?: QuoteStatus | null;
  draftNeedsReview?: boolean;
  authorizedCharges?: QuoteLine[];
}
export interface TechnicianProofPayload {
  proofNote?: string;
  proofs: Array<{
    url: string;
    type: "photo";
    metadata?: { public_id: string };
  }>;
}
export interface TechnicianMutationResponse {
  job?: { _id?: string; id?: string; status?: string; invoiceId?: string };
  invoice?: {
    id?: string;
    invoiceNumber?: string;
    status?: string;
    grandTotal?: number;
    amountPaid?: number;
    balanceDue?: number;
  };
}
