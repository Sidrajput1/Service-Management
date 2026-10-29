import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/role-route";
import { connectToDb } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth";
import { requireCustomerProfile } from "@/lib/customer";
import { authHref, safeCustomerDestination } from "@/lib/booking-redirect";
import ServiceProvider from "@/models/ServiceProvider";

export default async function ProfileCompletePage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const destination = safeCustomerDestination(typeof params.callbackUrl === "string" ? params.callbackUrl : null);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(authHref("/signin", destination));

  // Use the persisted role, rather than a query parameter or a client-side flag.
  const user = await requireCurrentUser();
  if (user.role === "customer") {
    // Reuse the existing profile provisioner for Google/OTP customers as well.
    await requireCustomerProfile();
    redirect(destination || "/customer");
  }
  if (user.role === "service_provider") {
    await connectToDb();
    const provider = await ServiceProvider.findOne({ ownerId: user._id }).lean();
    redirect(provider?.onboardingCompletedAt ? "/service-provider" : "/service-provider/onboarding");
  }
  if (["technician", "admin", "dispatcher"].includes(user.role)) redirect(getRoleHome(user.role));
  redirect("/signin");
}
