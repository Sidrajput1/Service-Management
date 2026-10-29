import type {
  BusinessImage,
  CoverageArea,
  SuggestedPrice,
} from "./marketplace-types";
export interface ReviewSummary {
  action?: string;
  reason?: string;
  actorId?: string;
  decidedAt?: string;
}
export interface AuditRow {
  id: string;
  action: string;
  actorId?: string;
  actorKind: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
  notificationState: string;
}
export interface AdminProviderRow {
  _id: string;
  companyName: string;
  businessType?: string;
  email: string;
  phone: string;
  verificationStatus: string;
  status: string;
  reviewVersion: number;
  onboardingCompletedAt?: string;
  reviewSubmittedAt?: string;
  createdAt: string;
}
export interface AdminProviderDetail extends AdminProviderRow {
  description?: string;
  address?: {
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  businessImage?: BusinessImage | null;
  areas: CoverageArea[];
  lastReview?: ReviewSummary;
  progress: Record<string, boolean>;
  history: AuditRow[];
  offerings: AdminOfferingRow[];
}
export interface AdminOfferingRow {
  _id: string;
  name: string;
  providerId: string;
  providerName: string;
  providerVerificationStatus: string;
  providerStatus: string;
  catalogId: string;
  catalogName: string;
  catalogActive: boolean;
  approvalStatus: string;
  reviewVersion: number;
  isActive: boolean;
  price: number;
  currency: string;
  unit: string;
  pricingModel: string;
  description?: string;
  taxPercent: number;
  offerEnabled: boolean;
  offerName?: string;
  discountType?: string;
  discountValue?: number;
  createdAt: string;
  reviewSubmittedAt?: string;
  lastReview?: ReviewSummary;
}
export interface AdminOfferingDetail extends AdminOfferingRow {
  catalogDescription?: string;
  categoryKey?: string;
  history: AuditRow[];
  providerImage?: BusinessImage | null;
}
export interface AdminCatalogRow {
  _id: string;
  itemType: string;
  name: string;
  catalogKey?: string;
  categoryKey?: string;
  description?: string;
  price: number;
  taxPercent: number;
  unit: string;
  isActive: boolean;
  skillKeys: string[];
  suggestedPrice?: SuggestedPrice | null;
  reviewVersion: number;
}
export interface AdminPage<T> {
  items: T[];
  nextCursor: string | null;
  previousCursor: string | null;
}
