export interface PublicService {
  id: string;
  name: string;
  description: string;
  offeringId: string;
  price: number;
  taxPercent: number;
  offerings?: PublicOffering[];
}
export interface PublicOffering {
  pricingModel?: "fixed" | "starting" | "per_unit" | "quote_required";
  unit?: string;
  id: string;
  name: string;
  description: string;
  providerName: string;
  serviceAreas: string[];
  price: number;
  taxPercent: number;
  offerName?: string;
}

export type PublicCatalog = {
  status: "ready" | "error";
  services: PublicService[];
};
