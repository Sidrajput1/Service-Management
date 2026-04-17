import Booking from "@/models/booking";

export async function getBookingCustomerUserId(bookingId: string) {
  const booking = await Booking.findById(bookingId).populate({
    path: "customerId",
    populate: { path: "userId" },
  });

  const customer: any = booking?.customerId;
  return customer?.userId?._id ? String(customer.userId._id) : null;
}