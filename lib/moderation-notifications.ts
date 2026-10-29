import ModerationAudit, {
  type IModerationAudit,
} from "@/models/ModerationAudit";
import { createNotification } from "./notification";
import { moderationMessage } from "./moderation-message.mjs";
/** A committed decision is never rolled back because delivery is unavailable. */
export async function deliverModerationNotification(audit: IModerationAudit) {
  if (audit.notificationState !== "pending" || !audit.notificationRecipientId)
    return false;
  try {
    await createNotification(moderationMessage(audit));
    await ModerationAudit.updateOne(
      { _id: audit._id },
      {
        $set: { notificationState: "sent", notifiedAt: new Date() },
        $inc: { notificationAttempts: 1 },
      },
    );
    return false;
  } catch {
    try {
      await ModerationAudit.updateOne(
        { _id: audit._id },
        { $inc: { notificationAttempts: 1 } },
      );
    } catch {
      /* The durable pending audit remains retryable. */
    }
    return true;
  }
}
