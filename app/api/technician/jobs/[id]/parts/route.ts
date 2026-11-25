import { requireRole, ApiAuthError } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { requireTechnicianProfile } from "@/lib/technician";
import { addJobPartSchema, changeAssignedJobPart } from "@/lib/job-parts";
import { objectIdSchema } from "@/lib/pagination";
import Job from "@/models/job";
import PriceItem from "@/models/PriceItem";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tech } = await requireTechnicianProfile();
    const id = objectIdSchema.parse((await params).id);
    if (!(await Job.exists({ _id: id, technicianId: tech._id })))
      throw new ApiAuthError("Assigned job not found", 404);
    const items = await PriceItem.find({ itemType: "part", isActive: true })
      .select("name price unit")
      .sort({ name: 1 })
      .limit(500)
      .lean();
    return privateJson({ items });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["technician"]);
    const { tech, user } = await requireTechnicianProfile();
    const { id } = await params;
    return privateJson(
      await changeAssignedJobPart(id, String(tech._id), user, {
        action: "part_added",
        input: addJobPartSchema.parse(await request.json()),
      }),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
