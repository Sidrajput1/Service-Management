import { requireTechnicianProfile } from "@/lib/technician";
import { gpsReadingSchema } from "@/lib/location-validation";
import { recordJobArrival } from "@/lib/job-arrival";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, tech } = await requireTechnicianProfile();
    return privateJson(
      await recordJobArrival(
        objectIdSchema.parse((await params).id),
        String(tech._id),
        String(user._id),
        gpsReadingSchema.parse(await request.json()),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
