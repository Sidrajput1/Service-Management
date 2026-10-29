import { requireAdmin } from "@/lib/auth";
import { decideProvider } from "@/lib/moderation";
import { providerDecisionSchema } from "@/lib/admin-validation";
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
      await decideProvider(
        String(user._id),
        id,
        providerDecisionSchema.parse(await request.json()),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
