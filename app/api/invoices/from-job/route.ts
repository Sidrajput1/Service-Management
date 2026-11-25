import { apiFailure, privateJson } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { generateInvoiceForJob } from "@/lib/billing/generateInvoiceForJob";
import { assertFinanceWrite } from "@/lib/finance-security";
import { objectIdSchema } from "@/lib/pagination";
import { Types } from "mongoose";
import { z } from "zod";

const createFromJobSchema = z.object({ jobId: objectIdSchema }).strict();

export async function POST(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    assertFinanceWrite(request);
    const { jobId } = createFromJobSchema.parse(await request.json());
    const invoice = await generateInvoiceForJob(new Types.ObjectId(jobId));
    return privateJson({ invoice }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}
