import { requireCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/role-route";
import { InitialPasswordChange } from "@/components/auth/AuthExperience";
import { getServerSessionOrNull } from "@/lib/auth";
export default async function Page() {
  if (!(await getServerSessionOrNull()))
    redirect("/signin?callbackUrl=%2Fchange-password");
  const user = await requireCurrentUser({ allowPasswordChange: true });
  if (!user.mustChangePassword) redirect(getRoleHome(user.role));
  return <InitialPasswordChange />;
}
