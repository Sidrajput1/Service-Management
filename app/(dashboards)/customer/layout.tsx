import { requireCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/role-route";
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  if (user.role !== "customer") redirect(getRoleHome(user.role));
  return children;
}
