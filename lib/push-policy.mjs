import { safeNotificationLink } from "./notification-client.mjs";

/** Only trusted, explicitly selected existing events use the extra delivery channel. */
export const pushEvents = [
  "booking_accepted",
  "job_assigned",
  "technician_enroute",
  "technician_arrived",
  "service_completed",
  "invoice_available",
  "payment_verified",
  "booking_cancelled",
  "bill_review",
];
export const pushTitle = "Servizato";
export const pushBody = "Open your account to review an update.";
export function safePushPath(value, role) {
  return typeof value === "string" && value.length <= 300
    ? safeNotificationLink(value, role)
    : "/notifications";
}
export function pushEnvelope(notificationId, subscriptionId, bindingToken) {
  if (
    !/^[a-f\d]{24}$/i.test(notificationId) ||
    !/^[a-f\d]{24}$/i.test(subscriptionId) ||
    !/^[a-f\d]{64}$/i.test(bindingToken)
  )
    throw new Error("Invalid push delivery reference");
  // The OS never receives the in-app title/message, addresses, OTPs or payment details.
  return { v: 1, notificationId, subscriptionId, bindingToken };
}
