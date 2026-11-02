export const pushEvents: readonly [
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
export type PushEvent = (typeof pushEvents)[number];
export const pushTitle: string;
export const pushBody: string;
export function safePushPath(value: unknown, role: string): string;
export function pushEnvelope(
  notificationId: string,
  subscriptionId: string,
  bindingToken: string,
): {
  v: number;
  notificationId: string;
  subscriptionId: string;
  bindingToken: string;
};
