import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import TechnicianJobDetail from "@/components/technicians/TechnicianJobDetails";

//import TechnicianJobDetail from "@/components/technician/TechnicianJobDetail";

export default async function TechnicianJobPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const session =
    await getServerSession(
      authOptions,
    );

  const { id } =
    await params;

  return (
    <TechnicianJobDetail
      session={session}
      jobId={id}
    />
  );
}