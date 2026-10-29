import { requireCustomerProfile } from "@/lib/customer";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult } from "@/lib/pagination";
import Invoice from "@/models/invoice";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { customer } = await requireCustomerProfile();
    const { cursor, limit } = readPage(request);
    const rows = await Invoice.find({ customerId: customer._id, ...(cursor ? { _id: { $lt: cursor } } : {}) }).select("invoiceNumber bookingId jobId status currency grandTotal amountPaid balanceDue issuedAt dueDate createdAt").sort({ _id: -1 }).limit(limit + 1).lean();
    const page = pageResult(rows, limit);
    return privateJson({ invoices: page.items, nextCursor: page.nextCursor });
  } catch (error) { return apiFailure(error); }
}
