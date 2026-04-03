import z from "zod";

import Invoice from "@/models/invoice";
import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import { NextResponse } from "next/server";
import { calculateInvoiceTotal, recomputeBalance } from "@/lib/billing";
import Job from "@/models/job";
const UpdateInvoiceSchema = z.object({
    notes: z.string().optional(),
  discountAmount: z.coerce.number().optional(),
  taxPercent: z.coerce.number().optional(),
  status: z.enum(["draft", "issued", "partial", "paid", "cancelled"]).optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> } ){
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();
        const {id} = await params
        const invoice = await Invoice.findById(id)
      .populate("jobId")
      .populate("bookingId")
      .populate("customerId")
      .populate("createdBy");

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice });
    } catch (err:any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
    }
};


export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await request.json();
    const parsed = UpdateInvoiceSchema.parse(body);

    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (parsed.notes !== undefined) invoice.notes = parsed.notes;
    if (parsed.status) invoice.status = parsed.status;
    if (parsed.discountAmount !== undefined) invoice.discountAmount = parsed.discountAmount;
    if (parsed.taxPercent !== undefined) invoice.taxPercent = parsed.taxPercent;

    const totals = calculateInvoiceTotal(invoice.items, invoice.discountAmount, invoice.taxPercent);
    invoice.subtotal = totals.subtotal;
    invoice.discountAmount = totals.discountAmount;
    invoice.taxAmount = totals.taxAmount;
    invoice.grandTotal = totals.grandTotal;
    invoice.balanceDue = recomputeBalance(invoice.grandTotal, invoice.amountPaid);

    await invoice.save();

    const job = await Job.findById(invoice.jobId);
    if (job) {
      job.paymentStatus = invoice.balanceDue === 0 ? "paid" : invoice.amountPaid > 0 ? "partial" : "pending";
      await job.save();
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin"]);
    await connectToDb();

    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Paid invoice cannot be deleted" }, { status: 400 });
    }

    await Invoice.findByIdAndDelete(params.id);

    const job = await Job.findById(invoice.jobId);
    if (job) {
      job.invoiceId = undefined;
      job.paymentStatus = "unbilled";
      await job.save();
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
  }
}