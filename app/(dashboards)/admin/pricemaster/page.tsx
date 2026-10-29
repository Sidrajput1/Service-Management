import { readAdminCatalog } from "@/lib/admin-data";
import {
  AdminHeading,
  AdminReadError,
  AdminPagination,
} from "@/components/admin/AdminUi";
import { CatalogManagement } from "@/components/admin/CatalogManagement";
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  let data;
  try {
    data = await readAdminCatalog(raw);
  } catch (error) {
    return <AdminReadError error={error} />;
  }
  return (
    <>
      <AdminHeading
        title="Service catalog"
        description="Shared service definitions and suggested references. Providers maintain their own offering prices."
      />
      <form
        className="provider-panel mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        method="get"
      >
        <label className="text-xs font-semibold">
          Search names
          <input
            className="customer-input mt-2"
            name="q"
            maxLength={100}
            defaultValue={data.filters.q}
            placeholder="Service or item name"
          />
        </label>
        <label className="text-xs font-semibold">
          Category
          <select
            className="customer-select mt-2"
            name="category"
            defaultValue={data.filters.category}
          >
            <option value="">All categories</option>
            {data.categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Status
          <select
            className="customer-select mt-2"
            name="status"
            defaultValue={data.filters.status || "all"}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="text-xs font-semibold">
          Item type
          <select
            className="customer-select mt-2"
            name="type"
            defaultValue={data.filters.type}
          >
            {["service", "part", "visit", "other", "all"].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <button
          className="public-button public-button-primary self-end"
          type="submit"
        >
          Apply filters
        </button>
      </form>
      <CatalogManagement
        items={data.items}
        catalog={{
          categories: data.categories,
          skills: data.skills,
          services: [],
        }}
        units={data.units}
      />
      <AdminPagination
        base="/admin/pricemaster"
        params={data.filters}
        nextCursor={data.nextCursor}
        previousCursor={data.previousCursor}
      />
    </>
  );
}
