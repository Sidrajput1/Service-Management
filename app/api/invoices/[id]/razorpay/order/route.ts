import { ApiAuthError, requireCurrentUser } from "@/lib/auth";
import {
  createRazorpayOrder,
  findRazorpayOrderByReceipt,
  getRazorpayOrder,
} from "@/lib/razorpay";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import { saveCheckoutChannel } from "@/lib/invoice-online-payment";
import Customer from "@/models/customer";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Technician from "@/models/technician";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const id = objectIdSchema.parse((await params).id);
    const invoice = await Invoice.findById(id);
    if (!invoice) return privateJson({ error: "Invoice not found" }, 404);
    const staff = ["admin", "dispatcher"].includes(user.role);
    let allowed = staff;
    let customer = null;
    if (user.role === "customer") {
      customer = await Customer.findOne({ userId: user._id })
        .select("name email phone")
        .lean();
      allowed = Boolean(
        customer && String(invoice.customerId) === String(customer._id),
      );
    } else if (user.role === "technician") {
      const pro = await Technician.findOne({ userId: user._id })
        .select("_id")
        .lean();
      allowed = Boolean(
        pro &&
          (await Job.exists({ _id: invoice.jobId, technicianId: pro._id })),
      );
    }
    if (!allowed) return privateJson({ error: "Forbidden" }, 403);
    const payable = await saveCheckoutChannel(invoice, "order", staff);
    const amount = Math.round(Number(payable.balanceDue) * 100);
    const currency = payable.currency || "INR";
    const receipt = String(payable._id);
    let order;
    if (payable.razorpayOrderId) {
      order = await getRazorpayOrder(payable.razorpayOrderId);
    } else {
      try {
        order = await createRazorpayOrder({
          amountPaise: amount,
          currency,
          receipt,
          notes: {
            invoiceId: receipt,
            jobId: String(payable.jobId || ""),
            customerId: String(payable.customerId || ""),
          },
        });
      } catch (error) {
        // A duplicate receipt or a lost response can mean the gateway already created the order.
        order = await findRazorpayOrderByReceipt(receipt);
        if (!order) throw error;
      }
    }
    if (order.status === "paid")
      throw new ApiAuthError(
        "Payment is being reconciled. Refresh the invoice shortly.",
        409,
      );
    if (
      order.amount !== amount ||
      order.amount_due !== amount ||
      order.currency !== currency ||
      !["created", "attempted"].includes(order.status)
    )
      throw new ApiAuthError(
        "This checkout needs a payment review. Refresh your invoice for updates.",
        409,
      );
    await saveCheckoutChannel(payable, "order", staff, order);
    return privateJson({
      order: { id: order.id, amount: order.amount, currency: order.currency },
      keyId: process.env.RAZORPAY_KEY_ID,
      invoiceId: payable._id,
      customer,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
