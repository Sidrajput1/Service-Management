export interface CatalogCategory {
  key: string;
  label: string;
  isActive: boolean;
}
export interface CatalogSkill {
  key: string;
  label: string;
  categoryKey: string;
  isActive: boolean;
}
export type PricingModel = "fixed" | "starting" | "per_unit" | "quote_required";
export interface SuggestedPrice {
  amount: number;
  currency: string;
  unit: string;
  city?: string;
  sourceUrl?: string;
  checkedAt?: string;
  kind: "public_listing" | "configured";
  qualification?: string;
}
export interface CatalogItem {
  _id: string;
  name: string;
  catalogKey?: string;
  categoryKey?: string;
  skillKeys: string[];
  unit: string;
  taxPercent?: number;
  description?: string;
  isActive: boolean;
  suggestedPrice?: SuggestedPrice | null;
}
export interface MarketplaceCatalog {
  services: CatalogItem[];
  categories: CatalogCategory[];
  skills: CatalogSkill[];
  selectedServiceIds?: string[];
}
export interface CoverageArea {
  _id: string;
  city: string;
  state: string;
  locality?: string;
  pincode?: string;
  isActive: boolean;
  cityKey?: string;
  stateKey?: string;
  localityKey?: string;
}
export interface BusinessImage {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
}
export interface ProviderReviewSummary {
  action?: string;
  reason?: string;
  decidedAt?: string;
}
export interface ProviderProfile {
  status?: string;
  reviewVersion?: number;
  lastReview?: ProviderReviewSummary;
  id: string;
  companyName: string;
  businessType?: string;
  description?: string;
  email: string;
  phone: string;
  businessImage?: BusinessImage | null;
  address?: {
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  coverageAreas: CoverageArea[];
  services: string[];
  verificationStatus: string;
  onboardingCompletedAt?: string | null;
}
export interface ProviderOffering {
  approvalStatus?: string;
  reviewVersion?: number;
  lastReview?: ProviderReviewSummary;
  currency?: string;
  _id: string;
  priceItemId: CatalogItem | null;
  name: string;
  price: number;
  taxPercent: number;
  description?: string;
  isActive: boolean;
  pricingModel?: PricingModel;
  unit?: string;
  offerEnabled: boolean;
  offerName?: string;
  discountType?: "flat" | "percentage";
  discountValue?: number;
  offerStartsAt?: string;
  offerEndsAt?: string;
}
export interface ProRecord {
  _id: string;
  userId?: { _id: string; name?: string; email?: string; phone?: string };
  skills: string[];
  skillKeys?: string[];
  vehicleType?: string;
  status: string;
  isActive: boolean;
}
export interface InitialCredential {
  technicianId: string;
  email: string;
  temporaryPassword: string;
  expiresAt: string;
  creationKey: string;
}
export interface DiscoveryFilters {
  q?: string;
  provider?: string;
  city?: string;
  state?: string;
  locality?: string;
  pincode?: string;
  serviceId?: string;
  category?: string;
  minRating?: string;
  sort?: string;
  page?: string;
  limit?: string;
  providerId?: string;
  scope?: "local" | "other";
}
export interface DiscoveryOffering {
  offeringId: string;
  provider: {
    id: string;
    companyName: string;
    description?: string;
    businessImage?: BusinessImage | null;
    serviceAreas: string[];
    coverageAreas?: Array<
      Pick<CoverageArea, "city" | "state" | "locality" | "pincode" | "isActive">
    >;
  };
  service: {
    id: string;
    name: string;
    description?: string;
    categoryKey?: string;
  };
  pricing: {
    basePrice: number;
    finalPrice: number;
    taxPercent: number;
    offerActive: boolean;
    offerName?: string;
    model: PricingModel;
    unit: string;
  };
  rating: number | null;
  reviewCount: number;
  rankingScore: number;
  discoveryCoverage?: "matched" | "outside" | "uncertain";
}
export interface DiscoveryResult {
  providers: DiscoveryOffering[];
  page: number;
  hasMore: boolean;
}
