import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { termsAndConditions } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <LegalDocumentPage document={termsAndConditions} />;
}
