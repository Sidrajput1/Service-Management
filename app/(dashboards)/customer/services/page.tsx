import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { requireCurrentUser } from "@/lib/auth";
import { getRoleHome } from "@/lib/role-route";
import { authHref, bookingDestination } from "@/lib/booking-redirect";
import ServiceDiscovery from "./ServiceDiscovery";

export default async function CustomerServicesPage({ searchParams }: {
  searchParams: Promise<{ serviceId?: string; offeringId?: string }>;
}) {
  const params = await searchParams;
  const destination = params.serviceId ? bookingDestination(params.serviceId, params.offeringId) : "/customer/services";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(authHref("/signin", destination));
  const user = await requireCurrentUser();
  if (user.role !== "customer") redirect(getRoleHome(user.role));
  return <Suspense fallback={<p role="status">Loading your services…</p>}><ServiceDiscovery /></Suspense>;
}
