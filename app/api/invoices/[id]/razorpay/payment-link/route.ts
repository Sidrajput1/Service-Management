import { ApiAuthError, requireRole } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import {
  createRazorpayPaymentLink,
  findRazorpayPaymentLink,
  getRazorpayPaymentLink,
} from "@/lib/razorpay";
import { saveCheckoutChannel } from "@/lib/invoice-online-payment";
import Invoice from "@/models/invoice";
import Customer from "@/models/customer";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin", "dispatcher"]);
    const id = objectIdSchema.parse((await params).id);
    const invoice = await Invoice.findById(id);
    if (!invoice) return privateJson({ error: "Invoice not found" }, 404);
    const payable = await saveCheckoutChannel(invoice, "payment_link", true);
    const amount = Math.round(Number(payable.balanceDue) * 100);
    const currency = payable.currency || "INR";
    const reference = String(payable._id);
    let link;
    if (payable.razorpayPaymentLinkId) {
      link = await getRazorpayPaymentLink(payable.razorpayPaymentLinkId);
    } else {
      const customer = await Customer.findById(payable.customerId)
        .select("name email phone")
        .lean();
      try {
        link = await createRazorpayPaymentLink({
          amountPaise: amount,
          currency,
          description: `Invoice ${payable.invoiceNumber}`,
          reference_id: reference,
          customer: {
            name: customer?.name,
            email: customer?.email,
            contact: customer?.phone,
          },
          notes: {
            invoiceId: reference,
            jobId: String(payable.jobId || ""),
            bookingId: String(payable.bookingId || ""),
          },
        });
      } catch (error) {
        link = await findRazorpayPaymentLink(reference);
        if (!link) throw error;
      }
    }
    if (
      link.amount !== amount ||
      link.currency !== currency ||
      link.amount_paid ||
      link.status !== "created" ||
      link.reference_id !== reference
    )
      throw new ApiAuthError("This payment link needs a billing review.", 409);
    await saveCheckoutChannel(payable, "payment_link", true, {
      id: link.id,
      metadata: {
        ...payable.metadata,
        razorpayShortUrl: link.short_url,
        razorpayRawPaymentLink: link,
      },
    });
    return privateJson({
      paymentLinkId: link.id,
      shortUrl: link.short_url,
      amount: link.amount,
      currency: link.currency,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
