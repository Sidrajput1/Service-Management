import { requireRole } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { requireTechnicianProfile } from "@/lib/technician";
import {
  changeAssignedJobPart,
  changeJobPartSchema,
  removeJobPartSchema,
} from "@/lib/job-parts";

type Context = { params: Promise<{ id: string; partIndex: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireRole(["technician"]);
    const { tech, user } = await requireTechnicianProfile();
    const { id, partIndex } = await params;
    return privateJson(
      await changeAssignedJobPart(id, String(tech._id), user, {
        action: "part_updated",
        partId: partIndex,
        input: changeJobPartSchema.parse(await request.json()),
      }),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireRole(["technician"]);
    const { tech, user } = await requireTechnicianProfile();
    const { id, partIndex } = await params;
    return privateJson(
      await changeAssignedJobPart(id, String(tech._id), user, {
        action: "part_removed",
        partId: partIndex,
        input: removeJobPartSchema.parse(await request.json()),
      }),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
