import { requireProvider } from "@/lib/service-provider";
import { saveProviderOffering } from "@/lib/provider-offerings";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import ServiceOffering from "@/models/ServiceOffering";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    const existing = await ServiceOffering.findOne({
      _id: id,
      serviceProviderId: provider._id,
    }).lean();
    if (!existing)
      return privateJson({ error: "Service offering not found" }, 404);
    const body = await request.json();
    // Whitelisted validation runs over the merged state; identity cannot be changed.
    const value = {
      ...existing,
      ...body,
      priceItemId: String(existing.priceItemId),
      offerStartsAt:
        body.offerStartsAt !== undefined
          ? body.offerStartsAt
          : existing.offerStartsAt?.toISOString(),
      offerEndsAt:
        body.offerEndsAt !== undefined
          ? body.offerEndsAt
          : existing.offerEndsAt?.toISOString(),
    };
    return privateJson({
      success: true,
      offering: await saveProviderOffering(provider._id, value, { id }),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    const offering = await ServiceOffering.findOneAndUpdate(
      { _id: id, serviceProviderId: provider._id },
      { $set: { isActive: false }, $inc: { reviewVersion: 1 } },
      { new: true },
    );
    if (!offering)
      return privateJson({ error: "Service offering not found" }, 404);
    return privateJson({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
