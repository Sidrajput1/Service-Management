import { saveProviderProfile } from "@/lib/provider-review";
import { randomUUID } from "node:crypto";
import { requireProvider } from "@/lib/service-provider";
import { cloudinaryAction, readImageFile } from "@/lib/provider-images";
import { apiFailure, privateJson } from "@/lib/api-response";
import ProviderImageAsset from "@/models/ProviderImageAsset";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let publicId: string | undefined;
  try {
    const { provider } = await requireProvider();
    const file = await readImageFile(request);
    publicId = `servizato/providers/${provider._id}/brand-${randomUUID()}`;
    await ProviderImageAsset.create({
      providerId: provider._id,
      publicId,
      status: "pending",
    });
    const uploaded = await cloudinaryAction(
      "upload",
      {
        public_id: publicId,
        overwrite: "false",
        transformation: "c_limit,w_1200,h_1200",
        format: "webp",
      },
      file,
    );
    if (
      uploaded.public_id !== publicId ||
      !uploaded.secure_url?.startsWith("https://res.cloudinary.com/") ||
      !uploaded.width ||
      !uploaded.height ||
      uploaded.width > 1200 ||
      uploaded.height > 1200 ||
      !uploaded.bytes ||
      uploaded.bytes > 3 * 1024 * 1024
    )
      throw new Error("Image validation failed");
    const previous = provider.businessImage?.publicId;
    provider.businessImage = {
      url: uploaded.secure_url,
      publicId,
      bytes: uploaded.bytes,
      format: uploaded.format || "webp",
      width: uploaded.width,
      height: uploaded.height,
    };
    await saveProviderProfile(
      provider,
      { businessImage: provider.businessImage },
      true,
    );
    await ProviderImageAsset.updateOne(
      { publicId },
      { $set: { status: "attached" } },
    );
    if (previous) {
      await ProviderImageAsset.updateOne(
        { publicId: previous, providerId: provider._id },
        { $set: { status: "cleanup" } },
        { upsert: true },
      );
    }
    return privateJson({
      success: true,
      businessImage: provider.businessImage,
    });
  } catch (error) {
    if (publicId) {
      try {
        await ProviderImageAsset.updateOne(
          { publicId },
          { $set: { status: "cleanup" } },
        );
      } catch {
        /* The pending record is recoverable by cleanup. */
      }
    }
    return apiFailure(error);
  }
}
export async function DELETE() {
  try {
    const { provider } = await requireProvider();
    const previous = provider.businessImage?.publicId;
    provider.businessImage = null;
    await provider.save();
    if (previous)
      await ProviderImageAsset.updateOne(
        { publicId: previous, providerId: provider._id },
        { $set: { status: "cleanup" } },
        { upsert: true },
      );
    return privateJson({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
