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
};

//
// Provider accepted the customer's request
//

export async function notifyBookingAccepted(
  input: {
    customerUserId: string;

    bookingId: string;

    serviceName?: string;

    providerName?: string;
  },
) {
  await createNotification({
    recipientUserId:
      input.customerUserId,

    title:
      "Booking accepted",

    message:
      `${
        input.providerName ||
        "The service provider"
      } accepted your ${
        input.serviceName ||
        "service"
      } request.`,

    type: "booking",

    entityType: "booking",

    entityId:
      input.bookingId,

    actionUrl:
      `/customer/bookings/${input.bookingId}`,

    metadata: {
      serviceName:
        input.serviceName,

      providerName:
        input.providerName,
    },
  });
};

//
//-------------------------------
// Job assignment
//--------------------------------
export async function notifyJobAssigned(input: {
  technicianUserId: string;
  customerUserId?: string;
  jobId: string;
  bookingId: string;
  serviceName?: string;
  providerUserId?: string;
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
  };

  if (input.providerUserId) {
    await createNotification({
      recipientUserId:
        input.providerUserId,

      title:
        "Technician assigned",

      message:
        `A technician has been assigned to ${
          input.serviceName ||
          "the booking"
        }.`,

      type: "job",

      entityType: "job",

      entityId:
        input.jobId,

      actionUrl:
        `/service-provider/assigned-jobs/${input.jobId}`,

      metadata: {
        bookingId:
          input.bookingId,

        serviceName:
          input.serviceName,
      },
    });
  }
}

//
// Technician accepted the job
//

export async function notifyTechnicianAcceptedJob(
  input: {
    customerUserId?: string;

    providerUserId?: string;

    jobId: string;

    bookingId: string;

    serviceName?: string;

    technicianName?: string;
  },
) {
  if (input.customerUserId) {
    await createNotification({
      recipientUserId:
        input.customerUserId,

      title:
        "Technician accepted the job",

      message:
        `${
          input.technicianName ||
          "Your technician"
        } accepted the assigned job.`,

      type: "job",

      entityType: "job",

      entityId:
        input.jobId,

      actionUrl:
        `/customer/bookings/${input.bookingId}`,

      metadata: {
        serviceName:
          input.serviceName,
      },
    });
  }

  if (input.providerUserId) {
    await createNotification({
      recipientUserId:
        input.providerUserId,

      title:
        "Technician accepted",

      message:
        `${
          input.technicianName ||
          "The technician"
        } accepted the assigned job.`,

      type: "job",

      entityType: "job",

      entityId:
        input.jobId,

      actionUrl:
        `/service-provider/assigned-jobs/${input.jobId}`,

      metadata: {
        bookingId:
          input.bookingId,

        serviceName:
          input.serviceName,
      },
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
};

//
// Technician on the way
//

export async function notifyTechnicianEnroute(
  input: {
    customerUserId: string;

    jobId: string;

    bookingId: string;

    technicianName?: string;
  },
) {
  await notifyJobStatus({
    customerUserId:
      input.customerUserId,

    jobId:
      input.jobId,

    bookingId:
      input.bookingId,

    title:
      "Technician is on the way",

    message:
      `${
        input.technicianName ||
        "Your technician"
      } is on the way to your service location.`,
  });
};

//
// Technician arrived
//

export async function notifyTechnicianArrived(
  input: {
    customerUserId: string;

    jobId: string;

    bookingId: string;

    technicianName?: string;
  },
) {
  await notifyJobStatus({
    customerUserId:
      input.customerUserId,

    jobId:
      input.jobId,

    bookingId:
      input.bookingId,

    title:
      "Technician arrived",

    message:
      `${
        input.technicianName ||
        "Your technician"
      } has arrived at the service location. Your verification code is ready.`,
  });
};

//
// OTP verified
//

export async function notifyCustomerOtpVerified(
  input: {
    customerUserId: string;

    jobId: string;

    bookingId: string;
  },
) {
  await notifyJobStatus({
    customerUserId:
      input.customerUserId,

    jobId:
      input.jobId,

    bookingId:
      input.bookingId,

    title:
      "Service verification completed",

    message:
      "Your service verification was completed successfully.",
  });
};

//
// Service completed
//

export async function notifyServiceCompleted(
  input: {
    customerUserId?: string;

    providerUserId?: string;

    technicianUserId?: string;

    jobId: string;

    bookingId: string;

    serviceName?: string;
  },
) {
  if (
    input.customerUserId
  ) {
    await createNotification({
      recipientUserId:
        input.customerUserId,

      title:
        "Service completed",

      message:
        `Your ${
          input.serviceName ||
          "service"
        } has been completed.`,

      type:
        "job",

      entityType:
        "job",

      entityId:
        input.jobId,

      actionUrl:
        `/customer/bookings/${input.bookingId}`,

      metadata: {
        serviceName:
          input.serviceName,
      },
    });
  }

  if (
    input.providerUserId
  ) {
    await createNotification({
      recipientUserId:
        input.providerUserId,

      title:
        "Job completed",

      message:
        `The ${
          input.serviceName ||
          "assigned job"
        } has been completed by the technician.`,

      type:
        "job",

      entityType:
        "job",

      entityId:
        input.jobId,

      actionUrl:
        `/service-provider/assigned-jobs/${input.jobId}`,

      metadata: {
        bookingId:
          input.bookingId,
      },
    });
  }

  if (
    input.technicianUserId
  ) {
    await createNotification({
      recipientUserId:
        input.technicianUserId,

      title:
        "Job completed",

      message:
        `Your ${
          input.serviceName ||
          "assigned job"
        } has been marked completed.`,

      type:
        "job",

      entityType:
        "job",

      entityId:
        input.jobId,

      actionUrl:
        `/technician/jobs/${input.jobId}`,

      metadata: {
        bookingId:
          input.bookingId,
      },
    });
  }
};

//
//----------------------------
//Invoice
//------------------------------
//

export async function notifyInvoiceIssued(input: {
  customerUserId?: string;

    providerUserId?: string;

    invoiceId: string;

    bookingId?: string;

    invoiceNumber: string;

    amount: number;
}) {
  if (!input.customerUserId) return;

  if(input.customerUserId){
  await createNotification({
    recipientUserId: input.customerUserId,
    title: "Invoice issued",
    message: `Your invoice ${input.invoiceNumber} is ready`,
    type: "invoice",
    entityType: "invoice",
    entityId: input.invoiceId,
    actionUrl: `/customer/invoice/${input.invoiceId}`,
    metadata: { 
      bookingId: input.bookingId,
      invoiceNumber: input.invoiceNumber,
      amount:input.amount
     },
  });
};

if (
    input.providerUserId
  ) {
    await createNotification({
      recipientUserId:
        input.providerUserId,

      title:
        "Invoice generated",

      message:
        `Invoice ${
          input.invoiceNumber
        } has been generated for the completed job.`,

      type:
        "invoice",

      entityType:
        "invoice",

      entityId:
        input.invoiceId,

      actionUrl:
        `/service-provider/assigned-jobs`,

      metadata: {
        bookingId:
          input.bookingId,

        amount:
          input.amount,
      },
    });
  };
};


// ─────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────
//


export async function notifyPaymentReceived(input: {
  customerUserId?: string;

    providerUserId?: string;

    technicianUserId?: string;

    invoiceId: string;

    invoiceNumber: string;

    paymentId: string;

    amount: number;

    jobId?: string;

    bookingId?: string;
}) {
  //
  // CUSTOMER
  //
  if (
    input.customerUserId
  ) {
    await createNotification({
      recipientUserId:
        input.customerUserId,

      title:
        "Payment successful",

      message:
        `Payment of ₹${input.amount} for invoice ${
          input.invoiceNumber
        } was successfully received.`,

      type:
        "payment",

      entityType:
        "payment",

      entityId:
        input.paymentId,

      actionUrl:
        `/customer/invoice/${input.invoiceId}`,

      metadata: {
        amount:
          input.amount,

        invoiceNumber:
          input.invoiceNumber,

        bookingId:
          input.bookingId,
      },
    });
  }

  //
  // PROVIDER
  //
  if (
    input.providerUserId
  ) {
    await createNotification({
      recipientUserId:
        input.providerUserId,

      title:
        "Payment received",

      message:
        `Customer payment of ₹${input.amount} for invoice ${
          input.invoiceNumber
        } has been received.`,

      type:
        "payment",

      entityType:
        "payment",

      entityId:
        input.paymentId,

      actionUrl:
        `/service-provider/payments`,

      metadata: {
        amount:
          input.amount,

        invoiceNumber:
          input.invoiceNumber,

        jobId:
          input.jobId,

        bookingId:
          input.bookingId,
      },
    });
  }

  //
  // TECHNICIAN
  //
  if (
    input.technicianUserId
  ) {
    await createNotification({
      recipientUserId:
        input.technicianUserId,

      title:
        "Customer payment received",

      message:
        `Payment of ₹${input.amount} for your completed job has been received.`,

      type:
        "payment",

      entityType:
        "payment",

      entityId:
        input.paymentId,

      actionUrl:
        input.jobId
          ? `/technician/jobs/${input.jobId}`
          : undefined,

      metadata: {
        amount:
          input.amount,

        invoiceNumber:
          input.invoiceNumber,

        bookingId:
          input.bookingId,
      },
    });
  }
}


// ----------------------------------------------
// Rating notifcation
// -----------------------------------------------

export async function notifyReviewSubmitted(input: {
  providerUserId?: string;
  technicianUserId?: string;

  reviewId: string;
  bookingId: string;
  jobId: string;

  providerRating: number;
  technicianRating: number;
}) {
  if (input.providerUserId) {
    await createNotification({
      recipientUserId:
        input.providerUserId,

      title:
        "New customer review",

      message:
        `A customer left a ${input.providerRating}/5 rating for your service.`,

      type:
        "system",

      entityType:
        "customer",

      entityId:
        input.bookingId,

      actionUrl:
        `/service-provider/reviews`,

      metadata: {
        reviewId:
          input.reviewId,

        bookingId:
          input.bookingId,

        jobId:
          input.jobId,

        rating:
          input.providerRating,
      },
    });
  }

  if (input.technicianUserId) {
    await createNotification({
      recipientUserId:
        input.technicianUserId,

      title:
        "New customer review",

      message:
        `A customer rated your service ${input.technicianRating}/5.`,

      type:
        "system",

      entityType:
        "technician",

      entityId:
        input.jobId,

      actionUrl:
        `/technician/profile`,

      metadata: {
        reviewId:
          input.reviewId,

        bookingId:
          input.bookingId,

        jobId:
          input.jobId,

        rating:
          input.technicianRating,
      },
    });
  }
}