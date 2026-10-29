import { requireProvider } from "@/lib/service-provider";
export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProvider();
  return children;
}
