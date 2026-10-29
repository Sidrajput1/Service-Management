import { requireProvider } from "@/lib/service-provider";
import { applicableCommission } from "@/lib/finance-commission";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
import ServiceOffering from "@/models/ServiceOffering";
import { basisLabel } from "@/lib/finance-policy.mjs";
export async function GET(request: Request) {
  try {
    const { provider } = await requireProvider(),
      id = objectIdSchema.parse(
        new URL(request.url).searchParams.get("offeringId"),
      ),
      offering = await ServiceOffering.findOne({
        _id: id,
        serviceProviderId: provider._id,
      })
        .select("_id")
        .lean();
    if (!offering) return privateJson({ error: "Offering not found" }, 404);
    const { policy, acceptance } = await applicableCommission(
      provider._id,
      offering._id,
    );
    return privateJson({ policy, accepted: Boolean(acceptance), basisLabel });
  } catch (error) {
    return apiFailure(error);
  }
}
