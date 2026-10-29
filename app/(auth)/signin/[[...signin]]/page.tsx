import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/AuthExperience";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading sign in…</p>}>
      <AuthExperience />
    </Suspense>
  );
}
