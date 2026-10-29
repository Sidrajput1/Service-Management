import { requireAdmin } from "@/lib/auth";
import { writeCatalog } from "@/lib/admin-catalog";
import { requireRole } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import PriceItem from "@/models/PriceItem";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin", "dispatcher"]);
    const item = await PriceItem.findById(
      objectIdSchema.parse((await params).id),
    ).lean();
    return item
      ? privateJson({ item })
      : privateJson({ error: "Catalog item not found" }, 404);
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAdmin();
    return privateJson(
      await writeCatalog(
        String(user._id),
        await request.json(),
        objectIdSchema.parse((await params).id),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAdmin();
    return privateJson(
      await writeCatalog(
        String(user._id),
        { ...(await request.json()), isActive: false },
        objectIdSchema.parse((await params).id),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
