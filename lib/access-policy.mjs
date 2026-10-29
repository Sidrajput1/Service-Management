/** Shared, dependency-free authorization rules used by HTTP and Socket.IO. */
export function canReadConversation(user, conversation) {
  if (!user || !conversation) return false;
  if (user.role === "admin" || user.role === "dispatcher") return true;
  return (conversation.participants || []).some(participant => String(participant.userId) === String(user._id));
}

export function ownsResource(ownerId, customerId) {
  return Boolean(ownerId && customerId && String(ownerId) === String(customerId));
}

export function notificationAudience(user) {
  if (["admin", "dispatcher"].includes(user.role)) {
    return { $or: [{ recipientUserId: user._id }, { recipientUserId: null, recipientRole: user.role }] };
  }
  return { recipientUserId: user._id };
}

export function canPayInvoice(invoice) {
  return Boolean(invoice && ["issued", "partial"].includes(invoice.status) && Number.isFinite(Number(invoice.balanceDue)) && Number(invoice.balanceDue) > 0);
}

export function activeJobStatus(status) {
  return ["assigned", "enroute", "arrived", "otp_verified", "in_progress", "on_hold"].includes(status);
}

export function safeCustomerLink(value) {
  if (typeof value !== "string" || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const path = value.split(/[?#]/)[0];
  if (/^\/customer\/(bookings|jobs|invoice|invoices)\/[a-f\d]{24}$/i.test(path)) return path;
  if (["/customer/bookings", "/customer/messages", "/customer/invoice", "/customer/profile", "/notifications", "/services"].includes(path)) return path;
  return null;
}
