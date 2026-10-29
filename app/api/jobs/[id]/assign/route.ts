import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { assertFinanceWrite } from "@/lib/finance-security";
import { objectIdSchema } from "@/lib/pagination";
import { staffAssignJob } from "@/lib/staff-job-assignment";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {const {user}=await requireRole(["admin","dispatcher"]);assertFinanceWrite(request);const id=objectIdSchema.parse((await params).id),body=z.object({technicianId:objectIdSchema}).strict().parse(await request.json());return privateJson(await staffAssignJob(user,{jobId:id,technicianId:body.technicianId}));}catch(error){return apiFailure(error);}
}
