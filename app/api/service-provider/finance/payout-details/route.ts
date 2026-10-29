import { requireProvider } from "@/lib/service-provider";
import { assertFinanceWrite, payoutStorageReady } from "@/lib/finance-security";
import { apiFailure, privateJson } from "@/lib/api-response";
import { payoutInputSchema } from "@/lib/finance-validation";
import { savePayoutProfile } from "@/lib/finance-operations";
import { ProviderPayoutProfile, FinanceEvent } from "@/models/finance";
import { auditDto } from "@/lib/finance-operations";
export async function GET() {
  try {
    const { provider } = await requireProvider(),
      profile = await ProviderPayoutProfile.findOne({
        providerId: provider._id,
      })
        .select("-encrypted")
        .lean(),
      events = await FinanceEvent.find({
        providerId: provider._id,
        kind: {
          $in: ["payout_details_changed", "review_payout", "reveal_payout"],
        },
      })
        .sort({ _id: -1 })
        .limit(50)
        .lean();
    return privateJson({
      profile,
      history: events.map(auditDto),
      storageReady: payoutStorageReady(),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { user, provider } = await requireProvider();
    assertFinanceWrite(request);
    const input = payoutInputSchema.parse(await request.json());
    return privateJson(await savePayoutProfile(user, provider._id, input));
  } catch (error) {
    return apiFailure(error);
  }
}
