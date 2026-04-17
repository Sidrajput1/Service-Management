import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import InvoicePdf from "@/components/invoice/InvoicePdf";
import "@/models/job";
import "@/models/booking";
import "@/models/customer";


export async function GET( _: Request, { params }: { params: Promise<{ id: string }> }){
    try {
        await requireRole(["admin", "manager","customer"]);
        await connectToDb();
        const {id} = await params;

        const invoice = await Invoice.findById(id)
                        .populate("jobId")
                        .populate("bookingId")
                        .populate("customerId")
                        .lean();

        if(!invoice) {
            return NextResponse.json({error:"Invoice not found"}, {status: 404});
         }
        
         const job = invoice.jobId as any;
         const booking = invoice.bookingId as any;
            const customer = invoice.customerId as any;

    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      customer: {
        name: customer?.name || "",
        phone: customer?.phone || "",
        email: customer?.email || "",
        address:
          customer?.addresses?.[0]?.addressLine ||
          booking?.address?.addressLine ||
          "",
      },
      job: {
        serviceType: booking?.serviceType || "",
        scheduledAt: job?.scheduledAt
          ? new Date(job.scheduledAt).toLocaleString()
          : booking?.scheduledAt
          ? new Date(booking.scheduledAt).toLocaleString()
          : "",
      },
      items: invoice.items,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxPercent: invoice.taxPercent,
      taxAmount: invoice.taxAmount,
      grandTotal: invoice.grandTotal,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString() : "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleString() : "",
      notes: invoice.notes || "",
    };



    const pdfBuffer = await renderToBuffer(<InvoicePdf invoice={pdfData} />);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${String(invoice.invoiceNumber)}.pdf"`,
      },
    });

    } catch (error) {
        return NextResponse.json({
            error: (error as Error).message || "Server error"
        },{status:500});
    }
}