import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import ServiceProvider from "@/models/ServiceProvider";
import { ApiAuthError, requireCurrentUser } from "@/lib/auth";

export async function requireServiceProvider(userId: string) {
  await connectToDb();

  const user = await User.findOne({
    _id: userId,
    isActive: { $ne: false },
  }).select("-password");

  if (!user) {
    throw new ApiAuthError("User not found", 401);
  }

  if (user.role !== "service_provider") {
    throw new ApiAuthError("Service provider access required", 403);
  }

  const provider = await ServiceProvider.findOne({
    ownerId: user._id,
  });

  if (!provider) {
    throw new ApiAuthError("Service provider profile not found", 404);
  }

  return {
    user,
    provider,
  };
}

export async function requireProvider() {
  const user = await requireCurrentUser();
  if (user.role !== "service_provider")
    throw new ApiAuthError("Service provider access required", 403);
  const provider = await ServiceProvider.findOne({ ownerId: user._id });
  if (!provider)
    throw new ApiAuthError("Service provider profile not found", 404);
  return { user, provider };
}
