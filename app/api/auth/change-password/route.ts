import { passwordMutationResponse } from "@/lib/password-http";
export const runtime = "nodejs";
// Preserve mandatory initial Pro credential change with its stronger length rule.
export async function POST(request: Request) { return passwordMutationResponse(request, { initialOnly: true }); }
