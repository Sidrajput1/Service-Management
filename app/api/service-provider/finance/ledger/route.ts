import { requireProvider } from "@/lib/service-provider";
import { assertFinanceWrite } from "@/lib/finance-security";
import { apiFailure, privateJson } from "@/lib/api-response";
import { providerFinanceActionSchema } from "@/lib/finance-validation";
import { financeData } from "@/lib/finance-data";
import { financeTransaction, lockLedger } from "@/lib/finance-ledger";
import { acceptFinanceTerms } from "@/lib/finance-commission";
import { CommissionCollection } from "@/models/finance";
import {
  createCollectionLink,
  reconcileCollection,
} from "@/lib/finance-collections";
export async function GET(request: Request) {
  try {
    const { provider } = await requireProvider();
    return privateJson(await financeData(request, provider._id));
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { user, provider } = await requireProvider();
    assertFinanceWrite(request);
    const input = providerFinanceActionSchema.parse(await request.json());
    if (input.action === "create_collection_link")
      return privateJson(
        await createCollectionLink(user, provider._id, input.requestId),
      );
    if (input.action === "reconcile_collection")
      return privateJson(
        await reconcileCollection(input.collectionId, provider._id),
      );
    return privateJson(
      await financeTransaction(
        user,
        input.action,
        input.requestId,
        input,
        async (session) => {
          if (input.action === "accept_terms") {
            const acceptance = await acceptFinanceTerms(
              provider._id,
              user._id,
              input.policyId,
              session,
            );
            return {
              result: { accepted: true },
              event: {
                providerId: provider._id,
                resourceId: acceptance._id,
                details: { policyId: input.policyId },
              },
            };
          }
          const row = await lockLedger(input.ledgerId, session, provider._id);
          row.billState = "disputed";
          row.disputeReason = input.reason;
          if (row.collectionId)
            await CommissionCollection.updateOne(
              { _id: row.collectionId },
              { $set: { status: "review" } },
              { session },
            );
          await row.save({ session });
          return {
            result: { reported: true },
            event: {
              providerId: provider._id,
              ledgerId: row._id,
              reason: input.reason,
              details: { status: "disputed" },
            },
          };
        },
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
