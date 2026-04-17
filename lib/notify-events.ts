import { createNotification } from "./notification";


export async function notifyBookingCreated(input: {
  adminTitle?: string;
  adminMessage?: string;
  customerUserId?: string;
  bookingId: string;
  bookingUrlAdmin?: string;
  bookingUrlCustomer?: string;
  serviceName?: string;
}) {
  const {
    adminTitle = "New booking created",
    adminMessage = `A new booking was created for ${input.serviceName || "a service"}`,
    customerUserId,
    bookingId,
    bookingUrlAdmin = "/admin/bookings",
    bookingUrlCustomer = `/customer/bookings/${bookingId}`,
    serviceName,
  } = input;

  await createNotification({
    recipientRole: "admin",
    title: adminTitle,
    message: adminMessage,
    type: "booking",
    entityType: "booking",
    entityId: bookingId,
    actionUrl: bookingUrlAdmin,
    metadata: { serviceName },
  });

  if (customerUserId) {
    await createNotification({
      recipientUserId: customerUserId,
      title: "Your booking is confirmed",
      message: `Your service request for ${serviceName || "a service"} has been received`,
      type: "booking",
      entityType: "booking",
      entityId: bookingId,
      actionUrl: bookingUrlCustomer,
      metadata: { serviceName },
    });
  }
}

export async function notifyJobAssigned(input: {
  technicianUserId: string;
  customerUserId?: string;
  jobId: string;
  bookingId: string;
  serviceName?: string;
}) {
  await createNotification({
    recipientUserId: input.technicianUserId,
    title: "New job assigned",
    message: `You have been assigned a ${input.serviceName || "service"} job`,
    type: "job",
    entityType: "job",
    entityId: input.jobId,
    actionUrl: `/technician/jobs/${input.jobId}`,
    metadata: { bookingId: input.bookingId, serviceName: input.serviceName },
  });

  if (input.customerUserId) {
    await createNotification({
      recipientUserId: input.customerUserId,
      title: "Technician assigned",
      message: `A technician has been assigned to your booking`,
      type: "job",
      entityType: "booking",
      entityId: input.bookingId,
      actionUrl: `/customer/bookings/${input.bookingId}`,
      metadata: { jobId: input.jobId, serviceName: input.serviceName },
    });
  }
}

export async function notifyJobStatus(input: {
  customerUserId?: string;
  jobId: string;
  bookingId: string;
  title: string;
  message: string;
  actionUrl?: string;
  type?: "job" | "invoice" | "payment";
  metadata?: Record<string, any>;
}) {
  if (!input.customerUserId) return;

  await createNotification({
    recipientUserId: input.customerUserId,
    title: input.title,
    message: input.message,
    type: input.type || "job",
    entityType: "job",
    entityId: input.jobId,
    actionUrl: input.actionUrl || `/customer/bookings/${input.bookingId}`,
    metadata: input.metadata || {},
  });
}

export async function notifyInvoiceIssued(input: {
  customerUserId?: string;
  invoiceId: string;
  bookingId?: string;
  invoiceNumber: string;
}) {
  if (!input.customerUserId) return;

  await createNotification({
    recipientUserId: input.customerUserId,
    title: "Invoice issued",
    message: `Your invoice ${input.invoiceNumber} is ready`,
    type: "invoice",
    entityType: "invoice",
    entityId: input.invoiceId,
    actionUrl: `/customer/invoices/${input.invoiceId}`,
    metadata: { bookingId: input.bookingId, invoiceNumber: input.invoiceNumber },
  });
}

export async function notifyPaymentReceived(input: {
  customerUserId?: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentId: string;
  amount: number;
}) {
  if (!input.customerUserId) return;

  await createNotification({
    recipientUserId: input.customerUserId,
    title: "Payment received",
    message: `Payment for invoice ${input.invoiceNumber} was successful`,
    type: "payment",
    entityType: "payment",
    entityId: input.paymentId,
    actionUrl: `/customer/invoices/${input.invoiceId}`,
    metadata: { amount: input.amount, invoiceNumber: input.invoiceNumber },
  });
}