import { z } from "zod";
import { requireProvider } from "@/lib/service-provider";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import ServiceRequest from "@/models/ServiceRequest";

export const runtime = "nodejs";
const declineSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, provider } = await requireProvider();
    const { id } = await params;
    objectIdSchema.parse(id);
    const text = await request.text();
    const body = declineSchema.parse(text ? JSON.parse(text) : {});
    const result = await ServiceRequest.updateOne(
      { _id: id, serviceProviderId: provider._id, status: "open" },
      {
        $set: {
          status: "declined",
          declinedBy: user._id,
          declinedAt: new Date(),
          declineReason: body.reason || "",
        },
      },
    );
    if (result.matchedCount !== 1)
      return privateJson(
        { error: "Booking request is no longer available" },
        404,
      );
    return privateJson({ success: true, status: "declined" });
  } catch (error) {
    return apiFailure(error);
  }
}
