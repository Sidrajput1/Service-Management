import mongoose from "mongoose";
import { apiFailure, privateJson } from "@/lib/api-response";
import { ApiAuthError, requireRole } from "@/lib/auth";
import { attachInvoiceIfMissing } from "@/lib/billing/generateInvoiceForJob";
import { prepareInvoiceFinance } from "@/lib/finance-ledger";
import { assertFinanceWrite } from "@/lib/finance-security";
import {
  assertInvoiceMatchesJob,
  invoicePricingForJob,
  invoiceQuoteFields,
} from "@/lib/job-invoice-approval";
import { calculateInvoiceTotal } from "@/lib/billing";
import { objectIdSchema } from "@/lib/pagination";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Booking from "@/models/booking";
import { invoicePromotionSnapshot } from "@/lib/invoice-breakdown";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin", "dispatcher"]);
    assertFinanceWrite(request);
    const { id: rawId } = await params;
    const id = objectIdSchema.parse(rawId);
    const session = await mongoose.startSession();
    try {
      const invoice = await session.withTransaction(async () => {
        const invoice = await Invoice.findById(id).session(session);
        if (!invoice) throw new ApiAuthError("Invoice not found", 404);
        if (invoice.status !== "draft") {
          if (
            invoice.quotePricingSource === "job" &&
            invoice.status === "issued"
          ) {
            await assertInvoiceMatchesJob(invoice, undefined, session);
            return invoice;
          }
          throw new ApiAuthError("Only draft invoices can be finalized.", 409);
        }
        if (
          invoice.razorpayOrderId ||
          invoice.razorpayPaymentLinkId ||
          invoice.amountPaid > 0
        )
          throw new ApiAuthError(
            "This draft needs finance review before finalization.",
            409,
          );
        if (invoice.jobId) {
          const job = await Job.findById(invoice.jobId)
            .select("+finalQuote")
            .session(session);
          if (!job || String(job.bookingId) !== String(invoice.bookingId))
            throw new ApiAuthError(
              "This draft needs a valid booking reference.",
              409,
            );
          const booking = await Booking.findOne({
            _id: job.bookingId,
            customerId: invoice.customerId,
          })
            .select("pricing")
            .session(session);
          if (!booking)
            throw new ApiAuthError(
              "This draft needs the booking's customer reference.",
              409,
            );
          const pricing = await invoicePricingForJob(job, session);
          Object.assign(invoice, invoiceQuoteFields(pricing), {
            quotePricingSource: "job",
          });
          invoice.finalizedAt = new Date();
          invoice.appliedPromotion =
            invoicePromotionSnapshot(invoice, booking.pricing) ?? null;
          await attachInvoiceIfMissing(
            job._id as mongoose.Types.ObjectId,
            invoice._id,
            session,
          );
        } else {
          if (!invoice.items.length)
            throw new ApiAuthError(
              "Add at least one line item before finalizing.",
              400,
            );
          Object.assign(
            invoice,
            calculateInvoiceTotal(
              invoice.items,
              invoice.discountAmount,
              invoice.taxPercent,
            ),
          );
        }
        invoice.balanceDue = invoice.grandTotal;
        invoice.status = invoice.balanceDue === 0 ? "paid" : "issued";
        invoice.issuedAt ||= new Date();
        invoice.finalizedAt ||= new Date();
        await invoice.save({ session });
        return invoice;
      });
      await prepareInvoiceFinance(invoice._id);
      return privateJson({ invoice });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    return apiFailure(error);
  }
}
