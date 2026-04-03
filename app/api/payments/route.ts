import { NextResponse } from "next/server";
import { z } from "zod";

import { recomputeBalance } from "@/lib/billing";
import { requireCurrentUser, requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Payment from "@/models/payment";
import Invoice from "@/models/invoice";
import Job from "@/models/job";

const CreatePaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive(),
  mode: z.enum(["cash", "upi", "card", "wallet", "bank_transfer", "other"]),
  gateway: z.string().optional(),
  gatewayTxnId: z.string().optional(),
  status: z.enum(["created", "success", "failed", "refunded"]).optional(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const url = new URL(request.url);
    const invoiceId = url.searchParams.get("invoiceId");

    const filter: any = {};
    if (invoiceId) filter.invoiceId = invoiceId;

    const payments = await Payment.find(filter)
      .populate("invoiceId")
      .populate("jobId")
      .populate("customerId")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ payments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await request.json();
    const parsed = CreatePaymentSchema.parse(body);
    const currentUser = await requireCurrentUser();

    const invoice = await Invoice.findById(parsed.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const payment = await Payment.create({
      invoiceId: invoice._id,
      jobId: invoice.jobId,
      customerId: invoice.customerId,
      amount: parsed.amount,
      mode: parsed.mode,
      gateway: parsed.gateway,
      gatewayTxnId: parsed.gatewayTxnId,
      status: parsed.status || "success",
      paidAt: parsed.status === "success" || !parsed.status ? new Date() : undefined,
      receivedBy: currentUser._id,
      note: parsed.note,
    });

    if (payment.status === "success") {
      invoice.amountPaid = Math.round((invoice.amountPaid + payment.amount) * 100) / 100;
      invoice.balanceDue = recomputeBalance(invoice.grandTotal, invoice.amountPaid);
      invoice.status = invoice.balanceDue === 0 ? "paid" : "partial";
      if (!invoice.issuedAt) invoice.issuedAt = new Date();
      await invoice.save();

      const job = await Job.findById(invoice.jobId);
      if (job) {
        job.paymentStatus = invoice.balanceDue === 0 ? "paid" : "partial";
        await job.save();
      }
    }

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
  }
}