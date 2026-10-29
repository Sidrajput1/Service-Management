import { readAdminOverview } from "@/lib/admin-data";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function GET() {
  try {
    return privateJson(await readAdminOverview());
  } catch (error) {
    return apiFailure(error);
  }
}
