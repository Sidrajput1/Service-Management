import { requireTechnicianProfile } from "@/lib/technician";
import { gpsReadingSchema } from "@/lib/location-validation";
import { recordJobArrival } from "@/lib/job-arrival";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
/** Legacy URL requires a concrete active job; off-duty/global writes are no longer accepted. */
export async function POST(request: Request) {
  try {
    const { user, tech } = await requireTechnicianProfile();
    const { jobId, ...reading } = await request.json();
    return privateJson(
      await recordJobArrival(
        objectIdSchema.parse(jobId),
        String(tech._id),
        String(user._id),
        gpsReadingSchema.parse(reading),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
