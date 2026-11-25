import { PasswordRecoveryPage } from "@/components/auth/PasswordRecoveryPage";
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function Page({searchParams} : PageProps){
  const params = await searchParams

  const token =
    typeof params.token === "string" &&
    /^[a-f\d]{64}$/i.test(params.token)
      ? params.token
      : "";

    return <PasswordRecoveryPage reset initialToken={token}/>

}
// export default function Page() {
//   return <PasswordRecoveryPage reset />;
// }
