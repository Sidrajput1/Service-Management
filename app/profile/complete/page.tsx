// app/profile/complete/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CompleteProfileForm from "./CompleteProfileForm"; // client component (created below)
import { getRoleHome } from "@/lib/role-route";
import { connectToDb } from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";

// export default async function ProfileCompletePage() {
//   const session = await getServerSession(authOptions);
//   if (!session) {
//     // not signed in — send to sign in
//     redirect("/auth/signin");
//   }

//   // if name + email present and email not empty -> already complete
//   const role = (session.user as any)?.role;
//   const name = (session.user as any)?.name;
//   const email = (session.user as any)?.email;
//   const user = session.user as any;

//   /*
//    * --------------------------------------------
//    * CUSTOMER
//    * --------------------------------------------
//    */
//   if (user.role === "customer") {
//     redirect("/customer");
//   }

//   /*
//    * --------------------------------------------
//    * TECHNICIAN
//    * --------------------------------------------
//    */
//   if (user.role === "technician") {
//     redirect("/technician");
//   }

//   /*
//    * --------------------------------------------
//    * ADMIN / DISPATCHER
//    * --------------------------------------------
//    */
//   if (user.role === "admin" || user.role === "dispatcher") {
//     redirect("/admin");
//   }

//   /*
//    * --------------------------------------------
//    * SERVICE PROVIDER
//    * --------------------------------------------
//    */
//   if (user.role === "service_provider") {
//     await connectToDb();

//     const provider = await ServiceProvider.findOne({
//       ownerId: user.id,
//     }).lean();

//     /*
//      * Provider record doesn't exist.
//      * This should never normally happen because
//      * signup creates both User + ServiceProvider.
//      */
//     if (!provider) {
//       redirect("/service-provider/onboarding");
//     }

//     /*
//      * Provider has completed onboarding
//      */
//     if (provider.onboardingCompletedAt) {
//       redirect("/service-provider");
//     }

//     /*
//      * Provider has NOT completed onboarding
//      */
//     redirect("/service-provider/onboarding");
//   }

//   /*
//    * Unknown role
//    */
//   redirect("/auth/signin");

//   /*
//    * Only show profile completion when required.
//    *
//    * You can later make this more sophisticated
//    * depending on customer/provider profile data.
//    */
//   const profileLooksComplete = !!name && !!email;

//   if (profileLooksComplete) {
//     redirect(getRoleHome(role));
//   }

//   // render client form to complete profile
//   return (
//     // <CompleteProfileForm initialName={name || ""} initialEmail={email || ""} />
//     <div>
//       "This is the profile completion page. Please complete your profile."
//     </div>
//   );
// }

export default async function ProfileCompletePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const user = session.user as any;

  /*
   * --------------------------------------------
   * CUSTOMER
   * --------------------------------------------
   */
  if (user.role === "customer") {
    redirect("/customer");
  }

  /*
   * --------------------------------------------
   * TECHNICIAN
   * --------------------------------------------
   */
  if (user.role === "technician") {
    redirect("/technician/dashboard");
  }

  /*
   * --------------------------------------------
   * ADMIN / DISPATCHER
   * --------------------------------------------
   */
  if (
    user.role === "admin" ||
    user.role === "dispatcher"
  ) {
    redirect("/admin/dashboard");
  }

  /*
   * --------------------------------------------
   * SERVICE PROVIDER
   * --------------------------------------------
   */
  if (user.role === "service_provider") {
    await connectToDb();

    const provider = await ServiceProvider.findOne({
      ownerId: user.id,
    }).lean();

    /*
     * Provider record doesn't exist.
     * This should never normally happen because
     * signup creates both User + ServiceProvider.
     */
    if (!provider) {
      redirect("/service-provider/onboarding");
    }

    /*
     * Provider has completed onboarding
     */
    if (provider.onboardingCompletedAt) {
      redirect("/service-provider");
    }

    /*
     * Provider has NOT completed onboarding
     */
    redirect("/service-provider/onboarding");
  }

  /*
   * Unknown role
   */
  redirect("/auth/signin");
}
