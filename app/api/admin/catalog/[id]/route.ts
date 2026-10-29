import { requireAdmin } from "@/lib/auth";
import { writeCatalog } from "@/lib/admin-catalog";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAdmin();
    return privateJson(
      await writeCatalog(
        String(user._id),
        await request.json(),
        objectIdSchema.parse((await params).id),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
