import { readProvider } from "@/lib/admin-data";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return privateJson(
      await readProvider(objectIdSchema.parse((await params).id)),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
