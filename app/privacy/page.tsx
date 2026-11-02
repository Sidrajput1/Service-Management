import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { privacyPolicy } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyPolicy} />;
}
