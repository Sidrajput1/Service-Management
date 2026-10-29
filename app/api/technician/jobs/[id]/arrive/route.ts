import { requireTechnicianProfile } from "@/lib/technician";
import { recordJobArrival } from "@/lib/job-arrival";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, tech } = await requireTechnicianProfile(),
      id = objectIdSchema.parse((await params).id),
      result = await recordJobArrival(id, String(tech._id), String(user._id));
    return privateJson({ ...result, job: { _id: id, status: result.status } });
  } catch (error) {
    return apiFailure(error);
  }
}
