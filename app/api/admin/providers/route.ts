import { readProviders } from "@/lib/admin-data";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function GET(request: Request) {
  try {
    return privateJson(
      await readProviders({
        status: "pending",
        ...Object.fromEntries(new URL(request.url).searchParams),
      }),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
