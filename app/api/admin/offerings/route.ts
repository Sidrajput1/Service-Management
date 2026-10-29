import { readOfferings } from "@/lib/admin-data";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function GET(request: Request) {
  try {
    return privateJson(
      await readOfferings({
        status: "pending",
        ...Object.fromEntries(new URL(request.url).searchParams),
      }),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
