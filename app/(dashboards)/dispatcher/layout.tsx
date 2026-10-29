import { requireRole, ApiAuthError } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function DispatcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["dispatcher"]);
  } catch (error) {
    if (error instanceof ApiAuthError && error.status === 401)
      redirect("/signin");
    if (error instanceof ApiAuthError && error.status === 403)
      return <p role="alert">Dispatcher access required.</p>;
    throw error;
  }
  return children;
}
