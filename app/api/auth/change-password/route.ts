import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import User from "@/models/user";
const schema = z
  .object({
    currentPassword: z.string().min(1).max(100),
    newPassword: z
      .string()
      .min(12)
      .max(72)
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Password must fit within 72 UTF-8 bytes",
      ),
  })
  .refine(
    (value) => value.newPassword !== value.currentPassword,
    "Choose a different password",
  );
export async function POST(request: Request) {
  try {
    const identity = await requireCurrentUser({ allowPasswordChange: true });
    const value = schema.parse(await request.json());
    const user = await User.findOne({
      _id: identity._id,
      mustChangePassword: true,
      isActive: true,
    });
    if (!user || !(await bcrypt.compare(value.currentPassword, user.password)))
      return privateJson({ error: "The temporary credential is invalid" }, 400);
    const changed = await User.findOneAndUpdate(
      {
        _id: user._id,
        credentialVersion: user.credentialVersion,
        password: user.password,
        mustChangePassword: true,
      },
      {
        $set: {
          password: await bcrypt.hash(value.newPassword, 12),
          mustChangePassword: false,
        },
        $unset: { temporaryPasswordExpiresAt: 1 },
        $inc: { credentialVersion: 1 },
      },
    );
    if (!changed)
      return privateJson(
        { error: "Credential changed. Sign in again before retrying." },
        409,
      );
    return privateJson({ success: true, signInRequired: true });
  } catch (error) {
    return apiFailure(error);
  }
}
