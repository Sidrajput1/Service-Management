import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth";
import { assertFinanceWrite } from "@/lib/finance-security";
import { apiFailure, privateJson } from "@/lib/api-response";
import { adminFinanceActionSchema } from "@/lib/finance-validation";
import { financeData } from "@/lib/finance-data";
import { adminFinanceOperation } from "@/lib/finance-operations";
import {
  createCollectionLink,
  reconcileCollection,
  cancelCollectionLink,
  prepareWeeklyReminders,
} from "@/lib/finance-collections";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    return privateJson(await financeData(request));
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin();
    assertFinanceWrite(request);
    const input = adminFinanceActionSchema.parse(await request.json());
    if (input.action === "create_collection_link")
      return privateJson(
        await createCollectionLink(
          user,
          new mongoose.Types.ObjectId(input.providerId),
          input.requestId,
        ),
      );
    if (input.action === "reconcile_collection")
      return privateJson(await reconcileCollection(input.collectionId));
    if (input.action === "cancel_collection_link")
      return privateJson(
        await cancelCollectionLink(
          user,
          input.collectionId,
          input.reason,
          input.requestId,
        ),
      );
    if (input.action === "prepare_reminders")
      return privateJson(await prepareWeeklyReminders(user));
    return privateJson(await adminFinanceOperation(user, input));
  } catch (error) {
    return apiFailure(error);
  }
}
