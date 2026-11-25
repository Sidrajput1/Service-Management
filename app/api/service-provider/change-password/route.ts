import { passwordMutationResponse } from "@/lib/password-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return passwordMutationResponse(request, { providerOnly: true });
}
