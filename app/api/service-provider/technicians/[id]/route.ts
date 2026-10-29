import { z } from "zod";
import mongoose from "mongoose";
import { ApiAuthError } from "@/lib/auth";
import { requireProvider } from "@/lib/service-provider";
import { assertProNotWorking } from "@/lib/provider-technicians";
import { validateSkills, text } from "@/lib/marketplace-validation";
import { objectIdSchema } from "@/lib/pagination";
import { apiFailure, privateJson } from "@/lib/api-response";
import Technician from "@/models/technician";
import "@/models/user";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    const technician = await Technician.findOne({
      _id: id,
      serviceProviderId: provider._id,
    })
      .select("userId skills skillKeys vehicleType status isActive")
      .populate("userId", "name email phone")
      .lean();
    return technician
      ? privateJson({ technician })
      : privateJson({ error: "Pro not found" }, 404);
  } catch (error) {
    return apiFailure(error);
  }
}
const updateSchema = z.object({
  skillKeys: z.array(z.string().max(100)).max(30).optional(),
  vehicleType: text(80).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["offline", "available", "on_leave"]).optional(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    const body = updateSchema.parse(await request.json());
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const technician = await Technician.findOne({
          _id: id,
          serviceProviderId: provider._id,
        }).session(session);
        if (!technician) throw new ApiAuthError("Pro not found", 404);
        if (
          body.isActive === false ||
          (body.status && body.status !== technician.status)
        )
          await assertProNotWorking(technician._id, session);
        if (body.skillKeys)
          technician.set(
            validateSkills(body.skillKeys, technician.skillKeys || []),
          );
        if (body.vehicleType !== undefined)
          technician.vehicleType = body.vehicleType;
        if (body.status) technician.status = body.status;
        if (body.isActive !== undefined) {
          technician.isActive = body.isActive;
          if (!body.isActive) technician.status = "offline";
        }
        await technician.save({ session });
      });
    } finally {
      await session.endSession();
    }
    return privateJson({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return PATCH(
    new Request(request.url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    }),
    context,
  );
}
