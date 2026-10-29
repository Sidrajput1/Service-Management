import { requireCustomerProfile } from "@/lib/customer";
import { discover } from "@/lib/discovery";
import { apiFailure, privateJson } from "@/lib/api-response";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireCustomerProfile();
    return privateJson({ success: true, ...(await discover(request)) });
  } catch (error) {
    return apiFailure(error);
  }
}
