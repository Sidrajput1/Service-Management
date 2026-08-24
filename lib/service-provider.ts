import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import ServiceProvider from "@/models/ServiceProvider";

export async function requireServiceProvider(userId: string) {
  await connectToDb();

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "service_provider") {
    throw new Error("Service provider access required");
  }

  const provider = await ServiceProvider.findOne({
    ownerId: user._id,
  });

  if (!provider) {
    throw new Error("Service provider profile not found");
  }

  return {
    user,
    provider,
  };
}