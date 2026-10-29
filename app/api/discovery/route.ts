import { discover } from "@/lib/discovery";
import { apiFailure } from "@/lib/api-response";
export async function GET(request: Request) {
  try {
    return Response.json(await discover(request), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
