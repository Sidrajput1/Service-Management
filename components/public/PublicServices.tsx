import { getPublicServices } from "@/lib/public-services";
import { ServiceCatalog } from "@/components/public/ServiceCatalog";

export async function PublicServices({ featured = false, query = "" }: { featured?: boolean; query?: string }) {
  const catalog = await getPublicServices();
  return <ServiceCatalog catalog={catalog} featured={featured} query={query} />;
}
