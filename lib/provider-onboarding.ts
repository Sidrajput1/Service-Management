import ServiceOffering from "@/models/ServiceOffering";
import Technician from "@/models/technician";
import { legacyCoverage } from "@/lib/marketplace-policy.mjs";
import type { IServiceProvider } from "@/models/ServiceProvider";
import type { ClientSession } from "mongoose";
export async function onboardingProgress(
  provider: IServiceProvider,
  session?: ClientSession,
) {
  const services = await ServiceOffering.countDocuments({
    serviceProviderId: provider._id,
    isActive: true,
  }).session(session || null);
  const team = await Technician.countDocuments({
    serviceProviderId: provider._id,
    isActive: true,
  }).session(session || null);
  return {
    businessProfile: Boolean(
      provider.companyName &&
        provider.businessType &&
        provider.email &&
        provider.phone,
    ),
    address: Boolean(
      provider.address?.addressLine &&
        provider.address?.city &&
        provider.address?.state &&
        /^[1-9]\d{5}$/.test(provider.address.pincode || ""),
    ),
    services: services > 0,
    serviceAreas: legacyCoverage(provider).some(
      (area: { isActive?: boolean }) => area.isActive !== false,
    ),
    team: team > 0,
  };
}
