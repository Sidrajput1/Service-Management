import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { assertFinanceWrite } from "@/lib/finance-security";
import { objectIdSchema } from "@/lib/pagination";
import { staffAssignJob } from "@/lib/staff-job-assignment";
import { scheduleDateSchema } from "@/lib/job-scheduling";
const assignmentSchema = z
  .object({
    technicianId: objectIdSchema,
    scheduledAt: scheduleDateSchema.optional(),
    scheduledEndAt: scheduleDateSchema.optional(),
  })
  .strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireRole(["admin", "dispatcher"]);
    assertFinanceWrite(request);
    const id = objectIdSchema.parse((await params).id);
    const body = assignmentSchema.parse(await request.json());
    return privateJson(await staffAssignJob(user, { jobId: id, ...body }));
  } catch (error) {
    return apiFailure(error);
  }
}
