import { apiFailure, privateJson } from "@/lib/api-response";
import { requireCustomerProfile } from "@/lib/customer";
import { assertFinanceWrite } from "@/lib/finance-security";
import { decideJobQuote, decideQuoteSchema } from "@/lib/job-quotes";
import { objectIdSchema } from "@/lib/pagination";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireCustomerProfile();
    assertFinanceWrite(request);
    const id = objectIdSchema.parse((await params).id);
    const decision = decideQuoteSchema.parse(await request.json());
    return privateJson(await decideJobQuote(id, user._id, decision));
  } catch (error) {
    return apiFailure(error);
  }
}
