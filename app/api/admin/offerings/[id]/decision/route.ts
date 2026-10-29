import { requireAdmin } from "@/lib/auth";
import { decideOffering } from "@/lib/moderation";
import { offeringDecisionSchema } from "@/lib/admin-validation";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAdmin();
    const id = objectIdSchema.parse((await params).id);
    return privateJson(
      await decideOffering(
        String(user._id),
        id,
        offeringDecisionSchema.parse(await request.json()),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
