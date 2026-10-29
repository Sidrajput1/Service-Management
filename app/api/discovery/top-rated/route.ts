import { discover } from "@/lib/discovery";
import { apiFailure, privateJson } from "@/lib/api-response";
import { parseDiscovery } from "@/lib/marketplace-validation";
export async function GET(request: Request) {
  try {
    if (!parseDiscovery(request).city)
      return privateJson(
        { error: "Choose a city to see its top-rated providers" },
        400,
      );
    return Response.json(await discover(request, { topRated: true }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
