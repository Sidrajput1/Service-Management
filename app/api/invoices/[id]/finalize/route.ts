import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import { calculateInvoiceTotal } from "@/lib/billing";
import Job from "@/models/job";


export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.items.length === 0) {
      return NextResponse.json({ error: "Add at least one item before finalizing" }, { status: 400 });
    }

    const totals = calculateInvoiceTotal(invoice.items as any, invoice.discountAmount, invoice.taxPercent);

    invoice.subtotal = totals.subtotal;
    invoice.discountAmount = totals.discountAmount;
    invoice.taxAmount = totals.taxAmount;
    invoice.grandTotal = totals.grandTotal;
    invoice.balanceDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);
    invoice.status = invoice.balanceDue === 0 ? "paid" : "issued";
    invoice.issuedAt = invoice.issuedAt || new Date();
    invoice.finalizedAt = new Date();

    await invoice.save();

    const job = await Job.findById(invoice.jobId);
    if (job) {
      job.paymentStatus = invoice.balanceDue === 0 ? "paid" : "pending";
      await job.save();
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
  }
}