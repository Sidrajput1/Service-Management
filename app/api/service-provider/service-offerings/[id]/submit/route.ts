import { requireProvider } from "@/lib/service-provider";
import { resubmitOffering } from "@/lib/provider-review";
import { resubmitSchema } from "@/lib/admin-validation";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    return privateJson(
      await resubmitOffering(
        String(user._id),
        String(provider._id),
        id,
        resubmitSchema.parse(await request.json()),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
