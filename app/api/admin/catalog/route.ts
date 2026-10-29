import { requireAdmin } from "@/lib/auth";
import { readAdminCatalog } from "@/lib/admin-data";
import { writeCatalog } from "@/lib/admin-catalog";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function GET(request: Request) {
  try {
    return privateJson(
      await readAdminCatalog(
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin();
    return privateJson(
      await writeCatalog(String(user._id), await request.json()),
      201,
    );
  } catch (error) {
    return apiFailure(error);
  }
}
