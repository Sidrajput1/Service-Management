import { requireCurrentUser } from "@/lib/auth";
import { createRazorpayOrder, getRazorpayOrder } from "@/lib/razorpay";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import { canPayInvoice } from "@/lib/access-policy.mjs";
import Customer from "@/models/customer";
import Invoice from "@/models/invoice";
import Job from "@/models/job";
import Technician from "@/models/technician";
import { FinanceLedger } from "@/models/finance";
export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const id = objectIdSchema.parse((await params).id);
    const invoice = await Invoice.findById(id);
    if (!invoice) return privateJson({ error: "Invoice not found" }, 404);
    let allowed = ["admin", "dispatcher"].includes(user.role);
    let customer = null;
    if (user.role === "customer") {
      customer = await Customer.findOne({ userId: user._id }).select("name email phone").lean();
      allowed = Boolean(customer && String(invoice.customerId) === String(customer._id));
    } else if (user.role === "technician") {
      const pro = await Technician.findOne({ userId: user._id }).select("_id").lean();
      allowed = Boolean(pro && await Job.exists({ _id: invoice.jobId, technicianId: pro._id }));
    }
    if (!allowed) return privateJson({ error: "Forbidden" }, 403);
    if(await FinanceLedger.exists({invoiceId:invoice._id,billState:"disputed"})) return privateJson({error:"This bill is under review. Resolve the payment details before starting checkout."},409);
    if (!canPayInvoice(invoice)) return privateJson({ error: "This invoice is not eligible for payment" }, 409);
    const amount = Math.round(Number(invoice.balanceDue) * 100);
    const currency = invoice.currency || "INR";
    const response = (order: { id: string; amount: number; currency: string }) => privateJson({ order: { id: order.id, amount: order.amount, currency: order.currency }, keyId: process.env.RAZORPAY_KEY_ID, invoiceId: invoice._id, customer });
    // Reuse an outstanding order so a retry does not invalidate another open checkout.
    if (invoice.razorpayOrderId) {
      const pending = await getRazorpayOrder(invoice.razorpayOrderId);
      if (pending.amount === amount && pending.amount_due === amount && pending.currency === currency && ["created", "attempted"].includes(pending.status)) return response(pending);
      if (pending.status === "paid") return privateJson({ error: "Payment is being reconciled. Refresh the invoice shortly." }, 409);
    }
    const previousOrder = invoice.razorpayOrderId;
    const order = await createRazorpayOrder({ amountPaise: amount, currency, receipt: String(invoice._id), notes: { invoiceId: String(invoice._id), jobId: String(invoice.jobId || ""), customerId: String(invoice.customerId || "") } });
    // Compare the current balance and order atomically after the gateway request.
    const saved = await Invoice.findOneAndUpdate({ _id: invoice._id, status: { $in: ["issued", "partial"] }, balanceDue: invoice.balanceDue, razorpayOrderId: previousOrder || null }, { $set: { razorpayOrderId: order.id } }, { new: true });
    if (!saved) return privateJson({ error: "Invoice updated during checkout. Please refresh and try again." }, 409);
    return response(order);
  } catch (error) { return apiFailure(error); }
}
