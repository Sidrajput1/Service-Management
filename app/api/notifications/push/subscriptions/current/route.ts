import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { currentPushDevice, requirePushLogin } from "@/lib/push-subscriptions";
import {
  assertPushWrite,
  currentPushSchema,
  limitPushRequests,
  readPushJson,
} from "@/lib/push-security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    assertPushWrite(request);
    limitPushRequests(String(user._id), "read");
    const login = await requirePushLogin(request, user),
      body = await readPushJson(request, currentPushSchema);
    return privateJson(await currentPushDevice(user, login, body.endpoint));
  } catch (error) {
    return apiFailure(error);
  }
}
