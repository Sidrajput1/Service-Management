import { requireCurrentUser } from "@/lib/auth";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
import { assertFinanceWrite } from "@/lib/finance-security";
import { billActionSchema } from "@/lib/finance-validation";
import {
  invoiceContext,
  publicBill,
  billAction,
  notifyBillChanged,
} from "@/lib/finance-ledger";
import { FinanceLedger } from "@/models/finance";
import { invoiceCanStartCheckout } from "@/lib/invoice-online-payment";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireCurrentUser(),
      id = objectIdSchema.parse((await params).id),
      { invoice, job, booking } = await invoiceContext(id, actor),
      row = await FinanceLedger.findOne({ invoiceId: invoice._id }).lean();
    const canPayOnline = actor.role === "customer" && await invoiceCanStartCheckout(invoice, { bill: row });
    return privateJson({ bill: { ...publicBill(invoice, row, job.status, booking.pricing), canPayOnline } });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireCurrentUser();
    assertFinanceWrite(request);
    const id = objectIdSchema.parse((await params).id),
      input = billActionSchema.parse(await request.json()),
      result = await billAction(id, actor, input);
    await notifyBillChanged(id, input);
    return privateJson(result);
  } catch (error) {
    return apiFailure(error);
  }
}
