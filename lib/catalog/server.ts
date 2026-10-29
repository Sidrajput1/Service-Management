import "server-only";
import PriceItem from "@/models/PriceItem";
import { connectToDb } from "@/lib/db";
import {
  catalogCategories,
  catalogSkills,
  catalogVersion,
} from "./definition.mjs";
import type { MarketplaceCatalog, CatalogItem } from "@/lib/marketplace-types";

export async function readCatalog(): Promise<
  MarketplaceCatalog & { version: number }
> {
  await connectToDb();
  const activeCategories = catalogCategories.filter(
    (category) => category.isActive,
  );
  const rows = await PriceItem.find({
    itemType: "service",
    isActive: true,
    $or: [
      {
        categoryKey: {
          $in: [...activeCategories.map((category) => category.key), "other"],
        },
      },
      { categoryKey: { $exists: false } },
      { categoryKey: "" },
    ],
  })
    .select(
      "name catalogKey categoryKey skillKeys unit taxPercent description isActive suggestedPrice price",
    )
    .sort({ name: 1 })
    .lean();
  const services = rows.map((row) => ({
    ...row,
    _id: String(row._id),
    skillKeys: row.skillKeys || [],
    unit: row.unit || "job",
    suggestedPrice:
      row.suggestedPrice?.amount !== undefined
        ? row.suggestedPrice
        : row.price > 0
          ? {
              amount: row.price,
              currency: "INR",
              unit: row.unit || "job",
              kind: "configured",
              qualification:
                "Administrator-configured indicative reference; not independently researched market pricing.",
            }
          : null,
  })) as CatalogItem[];
  return {
    version: catalogVersion,
    services,
    categories: [
      ...activeCategories,
      { key: "other", label: "Other services", isActive: true },
    ],
    skills: catalogSkills.filter(
      (skill) =>
        skill.isActive &&
        activeCategories.some((category) => category.key === skill.categoryKey),
    ),
  };
}
