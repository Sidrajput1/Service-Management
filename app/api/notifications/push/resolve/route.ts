import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import {
  requirePushLogin,
  resolvePushNotification,
} from "@/lib/push-subscriptions";
import {
  assertPushWrite,
  limitPushRequests,
  readPushJson,
  resolvePushSchema,
} from "@/lib/push-security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    assertPushWrite(request);
    limitPushRequests(String(user._id), "resolve");
    const login = await requirePushLogin(request, user),
      body = await readPushJson(request, resolvePushSchema);
    return privateJson(await resolvePushNotification(user, login, body));
  } catch (error) {
    return apiFailure(error);
  }
}
