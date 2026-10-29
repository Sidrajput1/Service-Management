import { requireProvider } from "@/lib/service-provider";
import { resubmitProvider } from "@/lib/provider-review";
import { resubmitSchema } from "@/lib/admin-validation";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function POST(request: Request) {
  try {
    const { user, provider } = await requireProvider();
    return privateJson(
      await resubmitProvider(
        String(user._id),
        String(provider._id),
        resubmitSchema.parse(await request.json()),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
