import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import {
  listPushDevices,
  registerPushDevice,
  requirePushLogin,
} from "@/lib/push-subscriptions";
import {
  assertPushWrite,
  limitPushRequests,
  readPushJson,
  registerPushSchema,
} from "@/lib/push-security";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await requireCurrentUser();
    limitPushRequests(String(user._id), "read");
    return privateJson(await listPushDevices(user));
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    assertPushWrite(request);
    limitPushRequests(String(user._id), "write");
    const login = await requirePushLogin(request, user),
      body = await readPushJson(request, registerPushSchema);
    return privateJson(await registerPushDevice(user, login, body));
  } catch (error) {
    return apiFailure(error);
  }
}
