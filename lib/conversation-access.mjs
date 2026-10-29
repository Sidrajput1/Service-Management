import { canReadConversation } from "./access-policy.mjs";
/** Resolve current job identities once, rather than trusting old participant arrays. */
export async function resolveJobMembers(db, conversation) {
  if (conversation?.type !== "job") return null;
  if (!conversation.jobId) return [];
  const job = await db.collection("jobs").findOne({ _id: conversation.jobId }, { projection: { bookingId: 1, technicianId: 1 } });
  if (!job) return [];
  const [booking, pro] = await Promise.all([
    db.collection("bookings").findOne({ _id: job.bookingId }, { projection: { customerId: 1 } }),
    job.technicianId ? db.collection("technicians").findOne({ _id: job.technicianId }, { projection: { userId: 1 } }) : null,
  ]);
  const customer = booking?.customerId ? await db.collection("customers").findOne({ _id: booking.customerId }, { projection: { userId: 1 } }) : null;
  return [{ id: String(customer?.userId || ""), role: "customer" }, { id: String(pro?.userId || ""), role: "technician" }];
}
export function canReadResolvedConversation(user, conversation, members) {
  if (!canReadConversation(user, conversation)) return false;
  if (["admin", "dispatcher"].includes(user.role)) return true;
  return members === null || members.some(member => member.id === String(user._id) && member.role === user.role);
}
