import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDb } from "@/lib/db";
import { providerRegistration } from "@/lib/registration";
import { apiFailure, privateJson } from "@/lib/api-response";
import { ApiAuthError } from "@/lib/auth";
import User from "@/models/user";
import ServiceProvider from "@/models/ServiceProvider";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const value = providerRegistration.parse({
      ownerName: body.ownerName || body.owner,
      companyName: body.companyName,
      email: body.email || body.provEmail,
      phone: body.phone || body.provPhone,
      password: body.password || body.provPassword,
      businessType: body.businessType,
      city: body.city,
      state: body.state,
    });
    await connectToDb();
    const hash = await bcrypt.hash(value.password, 12);
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        if (
          await User.exists({
            $or: [{ email: value.email }, { phone: value.phone }],
          }).session(session)
        )
          throw new ApiAuthError(
            "This email or phone is already registered. Please sign in.",
            409,
          );
        const [user] = await User.create(
          [
            {
              name: value.ownerName,
              email: value.email,
              phone: value.phone,
              password: hash,
              role: "service_provider",
            },
          ],
          { session },
        );
        const now = new Date();
        const [provider] = await ServiceProvider.create(
          [
            {
              ownerId: user._id,
              companyName: value.companyName,
              businessType: value.businessType,
              email: value.email,
              phone: value.phone,
              address: { city: value.city, state: value.state },
              verificationStatus: "pending",
              status: "active",
              trialStartedAt: now,
              trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          ],
          { session },
        );
        return {
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
          },
          provider: {
            id: String(provider._id),
            verificationStatus: provider.verificationStatus,
          },
        };
      });
      return privateJson({ success: true, ...result }, 201);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return privateJson(
        { error: "This account already exists. Please sign in." },
        409,
      );
    return apiFailure(error);
  }
}
