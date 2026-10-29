import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, ApiAuthError } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof ApiAuthError && error.status === 401)
      redirect("/signin");
    if (error instanceof ApiAuthError && error.status === 403)
      return (
        <main className="mx-auto max-w-2xl p-8">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Your current account is not authorized for administration.
          </p>
          <Link href="/" className="public-text-link mt-5">
            Return to Servizato
          </Link>
        </main>
      );
    throw error;
  }
  return <AdminShell>{children}</AdminShell>;
}
