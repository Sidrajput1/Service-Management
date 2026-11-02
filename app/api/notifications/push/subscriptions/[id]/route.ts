import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import { disablePushDevice } from "@/lib/push-subscriptions";
import {
  assertPushWrite,
  limitPushRequests,
  readPushJson,
} from "@/lib/push-security";
export const runtime = "nodejs";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    assertPushWrite(request);
    limitPushRequests(String(user._id), "write");
    const id = objectIdSchema.parse((await params).id);
    const header = request.headers.get("x-servizato-push-binding");
    const expectedBinding =
      header === null
        ? undefined
        : z
            .string()
            .regex(/^[a-f\d]{64}$/i)
            .parse(header);
    await readPushJson(request, z.object({}).strict(), 1024, true);
    return privateJson(await disablePushDevice(user, id, expectedBinding));
  } catch (error) {
    return apiFailure(error);
  }
}
