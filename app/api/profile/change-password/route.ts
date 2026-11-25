import { passwordMutationResponse } from "@/lib/password-http";
export const runtime = "nodejs";
// Preserve the existing profile endpoint for every role using the secure shared mutation.
export async function POST(request: Request) { return passwordMutationResponse(request, {}); }
