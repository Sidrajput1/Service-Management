import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import User from "@/models/user";
import Technician from "@/models/technician";
import Job from "@/models/job";
import { ApiAuthError } from "@/lib/auth";
import { text, validateSkills } from "@/lib/marketplace-validation";

export const proSchema = z.object({
  name: text(100).pipe(z.string().min(2)),
  email: z.union([z.email().max(254), z.literal("")]).optional(),
  phone: z
    .string()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+?[1-9]\d{9,14}$/)),
  skillKeys: z.array(z.string().max(100)).min(1).max(30),
  vehicleType: text(80).optional(),
  creationKey: z.string().uuid(),
});
export function createTemporaryCredential() {
  return {
    password: `Sv!${randomBytes(24).toString("base64url")}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}
export async function createProviderPro(
  providerId: mongoose.Types.ObjectId,
  input: unknown,
) {
  const value = proSchema.parse(input),
    skills = validateSkills(value.skillKeys);
  const prior = await Technician.findOne({
    serviceProviderId: providerId,
    creationKey: value.creationKey,
  })
    .select("_id")
    .lean();
  if (prior)
    return {
      success: true,
      duplicate: true,
      technician: { id: prior._id },
      credentialUnavailable: true,
    };
  const credential = createTemporaryCredential();
  const passwordHash = await bcrypt.hash(credential.password, 12);
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const repeated = await Technician.findOne({
        serviceProviderId: providerId,
        creationKey: value.creationKey,
      })
        .session(session)
        .lean();
      if (repeated) return { id: repeated._id, duplicate: true, email: "" };
      const email =
        value.email?.trim().toLowerCase() ||
        `pro-${value.phone.replace(/\D/g, "")}@service.local`;
      const existing = await User.exists({
        $or: [{ email }, { phone: value.phone }],
      }).session(session);
      // Never adopt somebody else's account or reset a pre-existing password through creation.
      if (existing)
        throw new ApiAuthError(
          "An account already uses this email or phone. Use an existing team member or a different login.",
          409,
        );
      const [user] = await User.create(
        [
          {
            name: value.name,
            email,
            phone: value.phone,
            password: passwordHash,
            role: "technician",
            mustChangePassword: true,
            temporaryPasswordExpiresAt: credential.expiresAt,
            credentialVersion: 1,
          },
        ],
        { session },
      );
      const [pro] = await Technician.create(
        [
          {
            userId: user._id,
            serviceProviderId: providerId,
            ...skills,
            vehicleType: value.vehicleType,
            creationKey: value.creationKey,
            status: "offline",
            isActive: true,
          },
        ],
        { session },
      );
      return { id: pro._id, email, duplicate: false };
    });
    if (!result) throw new Error("Account transaction did not complete");
    return {
      success: true,
      technician: { id: result.id },
      duplicate: result.duplicate,
      ...(result.duplicate
        ? { credentialUnavailable: true }
        : {
            temporaryPassword: credential.password,
            loginEmail: result.email,
            credentialExpiresAt: credential.expiresAt,
            creationKey: value.creationKey,
          }),
    };
  } finally {
    await session.endSession();
  }
}
export async function assertProNotWorking(
  id: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) {
  if (
    await Job.exists({
      technicianId: id,
      status: {
        $in: [
          "scheduled",
          "assigned",
          "enroute",
          "arrived",
          "otp_verified",
          "in_progress",
          "on_hold",
        ],
      },
    }).session(session || null)
  )
    throw new ApiAuthError(
      "This Pro has an active job. Finish or reassign it before changing availability or deactivating them.",
      409,
    );
}
