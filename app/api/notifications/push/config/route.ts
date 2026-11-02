import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { getPushConfiguration } from "@/lib/push-config";
import { pushStorageReady } from "@/lib/push-subscriptions";
import { limitPushRequests } from "@/lib/push-security";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await requireCurrentUser();
    limitPushRequests(String(user._id), "read");
    const config = getPushConfiguration();
    return privateJson({
      configured: Boolean(config),
      storageReady: await pushStorageReady(),
      publicKey: config?.publicKey || null,
      serviceWorkerPath: "/servizato-push-sw.js",
    });
  } catch (error) {
    return apiFailure(error);
  }
}
