import { requireAdmin } from "@/lib/auth";
import { writeCatalog } from "@/lib/admin-catalog";
import { requireRole } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { normalizeText, escapeRegex } from "@/lib/marketplace-policy.mjs";
import PriceItem from "@/models/PriceItem";
export async function GET(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    const params = new URL(request.url).searchParams,
      q = normalizeText(params.get("q")).slice(0, 100),
      itemType = params.get("type");
    const items = await PriceItem.find({
      ...(params.get("showInactive") !== "true" ? { isActive: true } : {}),
      ...(itemType && ["service", "part", "visit", "other"].includes(itemType)
        ? { itemType }
        : {}),
      ...(q ? { name: { $regex: escapeRegex(q), $options: "i" } } : {}),
    })
      .sort({ itemType: 1, name: 1 })
      .limit(500)
      .maxTimeMS(5000)
      .select(
        "name itemType price taxPercent unit description isActive catalogKey categoryKey skillKeys suggestedPrice reviewVersion",
      )
      .lean();
    return privateJson({ items });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin();
    return privateJson(
      await writeCatalog(String(user._id), await request.json()),
      201,
    );
  } catch (error) {
    return apiFailure(error);
  }
}
