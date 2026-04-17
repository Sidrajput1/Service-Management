// app/profile/complete/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CompleteProfileForm from "./CompleteProfileForm"; // client component (created below)
import { getRoleHome } from "@/lib/role-route";

export default async function ProfileCompletePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    // not signed in — send to sign in
    redirect("/auth/signin");
  }

  // if name + email present and email not empty -> already complete
  const role = (session.user as any)?.role;
  const name = (session.user as any)?.name;
  const email = (session.user as any)?.email;

  // Some OTP-created users may have default/placeholder name (like User1234)
  const looksAnonymous = !name || String(name).startsWith("User");
  const missingEmail = !email;

  if (!looksAnonymous && !missingEmail) {
    // profile is complete — send to dashboard
   // redirect("/admin/dashboard");
   redirect(getRoleHome(role));
  }

  // render client form to complete profile
  return <CompleteProfileForm initialName={name || ""} initialEmail={email || ""} />;
}