import { requireCurrentUser } from "@/lib/auth";
import Customer from "@/models/customer";
import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import InvoicePdf from "@/components/invoice/InvoicePdf";
import "@/models/job";
import "@/models/booking";
import "@/models/customer";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure } from "@/lib/api-response";


export async function GET( _: Request, { params }: { params: Promise<{ id: string }> }){
    try {
        const user = await requireCurrentUser();
        if (!["admin", "dispatcher", "manager", "customer"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        await connectToDb();
        const id = objectIdSchema.parse((await params).id);

        const customerProfile = user.role === "customer" ? await Customer.findOne({ userId: user._id }).select("_id").lean() : null;
        if (user.role === "customer" && !customerProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const invoice = await Invoice.findOne({ _id: id, ...(user.role === "customer" ? { customerId: customerProfile!._id } : {}) })
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
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${String(invoice.invoiceNumber)}.pdf"`,
      },
    });

    } catch (error) {
        return apiFailure(error);
    }
}
