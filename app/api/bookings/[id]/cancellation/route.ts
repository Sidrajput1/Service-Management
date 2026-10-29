import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
import { assertFinanceWrite } from "@/lib/finance-security";
import { requestIdSchema } from "@/lib/finance-validation";
import {
  cancellationContext,
  cancellationAllowed,
  cancelBooking,
  cancellationFeedback,
  notifyCancellation,
} from "@/lib/booking-cancellation";
import { CancellationCase } from "@/models/finance";
import { cancellationReasons } from "@/lib/finance-policy.mjs";
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("cancel"),
      requestId: requestIdSchema,
      reason: z.string().min(1),
      note: z.string().trim().max(1000).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("feedback"),
      requestId: requestIdSchema,
      answer: z.enum(["yes", "no", "not_sure", "prefer_not"]),
      note: z.string().trim().max(1000).optional(),
    })
    .strict(),
]);
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser(),
      id = objectIdSchema.parse((await params).id),
      { booking, job } = await cancellationContext(id, user);
    const record = await CancellationCase.findOne({
      bookingId: booking._id,
    }).lean();
    return privateJson({
      canCancel: cancellationAllowed(booking.status, job?.status, user.role),
      reasons: cancellationReasons[user.role] || {},
      record: record
        ? {
            _id: record._id,
            reason: record.reason,
            note: record.note,
            actorRole: record.actorRole,
            cancelledAt: record.cancelledAt,
            feedbackSaved: Boolean(record.feedbackAt),
            ...(user.role === "customer"
              ? { feedback: record.feedback, feedbackNote: record.feedbackNote }
              : {}),
            reviewStatus: record.reviewStatus,
          }
        : null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    assertFinanceWrite(request);
    const id = objectIdSchema.parse((await params).id),
      input = schema.parse(await request.json());
    const result =
      input.action === "cancel"
        ? await cancelBooking(user, id, input)
        : await cancellationFeedback(user, id, input);
    if (input.action === "cancel")
      await notifyCancellation(id, input.requestId);
    return privateJson(result);
  } catch (error) {
    return apiFailure(error);
  }
}
