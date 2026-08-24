// import Booking from "@/models/booking";

// export async function getBookingCustomerUserId(bookingId: string) {
//   const booking = await Booking.findById(bookingId).populate({
//     path: "customerId",
//     populate: { path: "userId" },
//   });

//   const customer: any = booking?.customerId;
//   return customer?.userId?._id ? String(customer.userId._id) : null;
// }

import { Technician } from "@/models";
import Booking from "@/models/booking";
import Job from "@/models/job";
import ServiceProvider from "@/models/ServiceProvider";

export async function getBookingCustomerUserId(
  bookingId: string,
) {
  const booking =
    await Booking.findById(
      bookingId,
    ).populate({
      path: "customerId",
      populate: {
        path: "userId",
      },
    });

  const customer: any =
    booking?.customerId;

  return customer?.userId?._id
    ? String(
        customer.userId._id,
      )
    : null;
}

export async function getJobNotificationRecipients(
  jobId: string,
) {
  const job =
    await Job.findById(
      jobId,
    ).lean();

  if (!job) {
    return {
      customerUserId: null,
      providerUserId: null,
      technicianUserId: null,
    };
  }

  const booking =
    await Booking.findById(
      job.bookingId,
    ).populate({
      path: "customerId",
      populate: {
        path: "userId",
      },
    });

  const customer: any =
    booking?.customerId;

  const customerUserId =
    customer?.userId?._id
      ? String(
          customer.userId._id,
        )
      : null;

  const technician =
    await Technician.findById(
      job.technicianId,
    );

  const technicianUserId =
    technician?.userId
      ? String(
          technician.userId,
        )
      : null;

  const provider =
    await ServiceProvider.findById(
      job.serviceProviderId,
    ).select(
      "ownerId companyName",
    );

  const providerUserId =
    provider?.ownerId
      ? String(
          provider.ownerId,
        )
      : null;

  return {
    customerUserId,
    providerUserId,
    technicianUserId,
  };
}