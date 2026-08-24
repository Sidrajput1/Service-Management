import { NextResponse } from "next/server";

import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import { generateInvoiceForJob } from "@/lib/billing/generateInvoiceForJob";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    await connectToDb();

    const job = await Job.findById(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    const invoice = await generateInvoiceForJob(job._id);

    return NextResponse.json({
      success: true,
      message: "Invoice generated successfully",
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        grandTotal: invoice.grandTotal,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
        jobId: invoice.jobId,
      },
    });
  } catch (error: any) {
    console.error("TEST INVOICE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Invoice generation failed",
      },
      { status: 500 },
    );
  }
}