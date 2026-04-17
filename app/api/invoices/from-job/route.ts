import { requireCurrentUser, requireRole } from "@/lib/auth";
import { calculateInvoiceTotal, generateInvoiceNumber } from "@/lib/billing";
import { connectToDb } from "@/lib/db";
import { notifyInvoiceIssued } from "@/lib/notify-events";
import Booking from "@/models/booking";
import Customer from "@/models/customer";
import Invoice from "@/models/invoice";
import Job from "@/models/job";

import { NextResponse } from "next/server";
import '@/models/customer';

import { z } from "zod";

const CreateFromJobSchema = z.object({
  jobId: z.string().min(1),
  items: z
    .array(
      z.object({
        itemType: z.enum(["service", "part", "visit", "discount", "other"]),
        description: z.string().min(1),
        qty: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0),
        taxable: z.boolean().optional(),
        meta: z.record(z.string(), z.any()).optional(),
      }),
    )
    .default([]),
  discountAmount: z.coerce.number().optional().default(0),
  taxPercent: z.coerce.number().optional().default(18),
  notes: z.string().optional(),
  dueDays: z.coerce.number().optional().default(0),
});

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await req.json();

    const parsed = CreateFromJobSchema.parse(body);
    const currentUser = await requireCurrentUser();

    const job = await Job.findById(parsed.jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 500 });
    }

    const existing = await Invoice.findOne({ jobId: job._id });

    if (existing) {
      return NextResponse.json(
        {
          error: "Invoice already existed for this job",
        },
        { status: 400 },
      );
    }

    const booking = await Booking.findById(job.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 400 });
    }

    const customer = await Customer.findById(booking.customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const items = parsed.items.map((item) => ({
      ...item,
      amount: Number(item.qty) * Number(item.unitPrice),
    }));

    const total = calculateInvoiceTotal(
      items,
      parsed.discountAmount,
      parsed.taxPercent,
    );

    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      jobId: job._id,
      bookingId: booking._id,
      customerId: customer._id,
      createdBy: currentUser._id,
      status: "draft",
      currency: "INR",
      items,
      subtotal: total.subtotal,
      discountAmount: total.discountAmount,
      taxPercent: total.taxPercent,
      taxAmount: total.taxAmount,
      grandTotal: total.grandTotal,
      amountPaid: 0,
      balanceDue: total.grandTotal,
      notes: parsed.notes || undefined,
      dueDate: parsed.dueDays
        ? new Date(Date.now() + parsed.dueDays * 24 * 60 * 60 * 1000)
        : undefined,
    });

    const bookingPopulated = await Booking.findById(booking._id).populate("customerId");
    const customer2 = bookingPopulated?.customerId as any;

    await notifyInvoiceIssued({
  customerUserId: customer2?.userId ? String(customer2.userId) : undefined,
  invoiceId: invoice._id.toString(),
  bookingId: booking._id.toString(),
  invoiceNumber: invoice.invoiceNumber,
});

    job.invoiceId = invoice._id;
    ((job.paymentStatus = "pending"), await job.save());

    return NextResponse.json({ invoice }, { status: 201 });
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
