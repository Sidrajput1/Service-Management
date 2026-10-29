import { readCatalog } from "@/lib/catalog/server";
import { apiFailure } from "@/lib/api-response";
export async function GET() {
  try {
    return Response.json(await readCatalog(), {
      headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
