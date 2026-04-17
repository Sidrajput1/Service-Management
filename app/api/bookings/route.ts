import { requireCurrentUser, requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import { createNotification, createNotificationForRole } from "@/lib/notification";
import { getBookingCustomerUserId } from "@/lib/notification-recipents";
import { notifyBookingCreated } from "@/lib/notify-events";
import Booking from "@/models/booking";
import Customer from "@/models/customer";
import Lead from "@/models/lead";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { z } from "zod";

const BookingCreateSchema = z.object({
  leadId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  serviceType: z.string().min(1, "Service type is required"),
  subService: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  estimatedPrice: z.coerce.number().optional().nullable(),
  address: z
    .object({
      addressLine: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      pincode: z.string().optional().nullable(),
    })
    .optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);

    await connectToDb();

    const url = new URL(request.url);

    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Number(url.searchParams.get("limit") || "20"));
    const q = url.searchParams.get("q") || "";

    const filter: any = {};

    if (q) {
      filter.$or = [
        { serviceType: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
      ];
    }

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate("customerId")
      .populate("leadId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ bookings, total, page, limit });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await request.json();
    const parsed = BookingCreateSchema.parse(body);

    const currentUser = (await requireCurrentUser()) as any;
    console.log("Current User:", currentUser);

    let customerId = parsed.customerId || null;
    let leadId = parsed.leadId || null;
    let customer: any = null;

    if (!customerId && !leadId) {
      return NextResponse.json(
        { error: "Either customerId or leadId is required" },
        { status: 400 },
      );
    }

    if (!customerId && leadId) {
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      if (!lead.phone) {
        return NextResponse.json(
          { error: "Lead phone number is required to create customer" },
          { status: 400 },
        );
      }

      //const existingCustomer = await Customer.findOne({ phone: lead.phone });

      const user = await User.findOne({ phone: lead.phone });

      let customer;

      // if(existingCustomer && user && !existingCustomer.userId){
      //   existingCustomer.userId = user._id;
      //   await existingCustomer.save();
      // }

      if (user) {
        customer = await Customer.findOne({ userId: user._id });

        if (!customer) {
          customer = await Customer.create({
            userId: user._id,
            name: user.name || lead.name || "Customer",
            phone: user.phone,
            email: user.email,
            addresses: [],
            notes: lead.remarks || "",
          });
        }
      } else {
        // fallback if no user exists
        customer =
          (await Customer.findOne({ phone: lead.phone })) ||
          (await Customer.create({
            name: lead.name || lead.phone,
            phone: lead.phone,
            email: lead.email,
            addresses: [],
            notes: lead.remarks || "",
          }));
      }

      if (!customerId && customer) {
        // commented code has bugs . because this makes duplicate customers
        // if (existingCustomer) {
        //   customerId = existingCustomer._id.toString();
        // } else {
        //   const customer = await Customer.create({
        //     name: lead.name || lead.phone,
        //     phone: lead.phone,
        //     email: lead.email,
        //     addresses: parsed.address
        //       ? [
        //           {
        //             label: "Primary",
        //             addressLine: parsed.address.addressLine || "",
        //             city: parsed.address.city || "",
        //             state: parsed.address.state || "",
        //             pincode: parsed.address.pincode || "",
        //           },
        //         ]
        //       : [],
        //     notes: lead.remarks || "",
        //   });

        //   customerId = customer._id.toString();
        // }

        customerId = customer._id.toString();
        lead.status = "booked";
        await lead.save();
      }
    }
    // customerId = customer._id;

    const booking = await Booking.create({
      leadId: leadId || undefined,
      customerId: customerId || undefined,
      serviceType: parsed.serviceType,
      subService: parsed.subService || undefined,
      scheduledAt: parsed.scheduledAt
        ? new Date(parsed.scheduledAt)
        : undefined,
      estimatedPrice: parsed.estimatedPrice || undefined,
      address: parsed.address
        ? {
            addressLine: parsed.address.addressLine || undefined,
            city: parsed.address.city || undefined,
            state: parsed.address.state || undefined,
            pincode: parsed.address.pincode || undefined,
          }
        : undefined,
      notes: parsed.notes || undefined,
      status: "confirmed",
      createdBy: currentUser.id,
    });

    // await notifyBookingCreated({
    //   customerUserId: customer?.userId ? String(customer.userId) : undefined,
    //   bookingId: booking._id.toString(),
    //   serviceName: booking.serviceType,
    // });

    const customerUserId = await getBookingCustomerUserId(booking._id.toString());

    await createNotificationForRole("admin",{
      title:"New booking created",
       message: `Booking created for ${booking.serviceType}`,
  type: "booking",
  entityType: "booking",
  entityId: booking._id.toString(),
  actionUrl: "/admin/bookings",
    });

    if(customerUserId){
      await createNotification({
    recipientUserId: customerUserId,
    title: "Your booking is confirmed",
    message: `Your service request for ${booking.serviceType} has been received`,
    type: "booking",
    entityType: "booking",
    entityId: booking._id.toString(),
    actionUrl: `/customer/bookings/${booking._id}`,
  });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 },
    );
  }
}
