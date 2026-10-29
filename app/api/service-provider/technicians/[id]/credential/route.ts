import bcrypt from "bcryptjs";
import { requireProvider } from "@/lib/service-provider";
import { createTemporaryCredential } from "@/lib/provider-technicians";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import Technician from "@/models/technician";
import User from "@/models/user";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    const pro = await Technician.findOne({
      _id: id,
      serviceProviderId: provider._id,
      isActive: true,
    })
      .select("userId")
      .lean();
    if (!pro) return privateJson({ error: "Pro not found" }, 404);
    const credential = createTemporaryCredential();
    const user = await User.findOneAndUpdate(
      { _id: pro.userId, role: "technician", mustChangePassword: true },
      {
        $set: {
          password: await bcrypt.hash(credential.password, 12),
          temporaryPasswordExpiresAt: credential.expiresAt,
        },
        $inc: { credentialVersion: 1 },
      },
      { new: true },
    )
      .select("email")
      .lean();
    if (!user)
      return privateJson(
        {
          error:
            "This Pro has already set their own password. An initial credential cannot be reissued.",
        },
        409,
      );
    return privateJson({
      temporaryPassword: credential.password,
      loginEmail: user.email,
      credentialExpiresAt: credential.expiresAt,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
