import { z } from "zod";
import { randomUUID } from "node:crypto";
import { objectIdSchema } from "@/lib/pagination";
import {
  normalizeText,
  normalizeKey,
  coverageKey,
  normalizeCoverage,
  normalizePincode,
} from "@/lib/marketplace-policy.mjs";
import {
  catalogCategories,
  catalogSkills,
  pricingModels,
  pricingUnits,
} from "@/lib/catalog/definition.mjs";
import { ApiAuthError } from "@/lib/auth";
export const text = (maximum: number) =>
  z.string().transform(normalizeText).pipe(z.string().max(maximum));
export const pinSchema = z
  .string()
  .transform(normalizePincode)
  .pipe(
    z.string().regex(/^[1-9]\d{5}$/, "Enter a valid six-digit Indian PIN code"),
  );
export const areaSchema = z.object({
  _id: z.string().uuid().optional(),
  city: text(80).pipe(z.string().min(2)),
  state: text(80).pipe(z.string().min(2)),
  locality: text(100).default(""),
  pincode: z.union([pinSchema, z.literal("")]).default(""),
  isActive: z.boolean().default(true),
});
export const areasSchema = z
  .array(areaSchema)
  .max(100)
  .superRefine((areas, context) => {
    const keys = new Set<string>(),
      ids = new Set<string>();
    for (const [index, area] of areas.entries()) {
      const key = coverageKey(area);
      if (keys.has(key))
        context.addIssue({
          code: "custom",
          message: "This service area is already configured",
          path: [index],
        });
      if (area._id && ids.has(area._id))
        context.addIssue({
          code: "custom",
          message: "Duplicate service-area ID",
          path: [index, "_id"],
        });
      keys.add(key);
      if (area._id) ids.add(area._id);
    }
  })
  .transform((areas) =>
    areas.map((area) =>
      normalizeCoverage({ ...area, _id: area._id || randomUUID() }),
    ),
  );
export const offeringSchema = z.object({
  currency: z.literal("INR").default("INR"),
  priceItemId: objectIdSchema,
  price: z.number().finite().min(0).max(1000000),
  taxPercent: z.number().finite().min(0).max(100).default(18),
  description: text(2000).default(""),
  pricingModel: z
    .enum(pricingModels as ["fixed", "starting", "per_unit", "quote_required"])
    .default("fixed"),
  unit: z
    .enum(
      pricingUnits as [
        "job",
        "visit",
        "item",
        "hour",
        "sq_ft",
        "ac",
        "bathroom",
        "kitchen",
        "seat",
      ],
    )
    .default("job"),
  isActive: z.boolean().default(true),
  offerEnabled: z.boolean().default(false),
  offerName: text(120).default(""),
  discountType: z.enum(["flat", "percentage"]).optional(),
  discountValue: z.number().finite().min(0).default(0),
  offerStartsAt: z.union([z.iso.datetime(), z.literal("")]).optional(),
  offerEndsAt: z.union([z.iso.datetime(), z.literal("")]).optional(),
});
export function validateOffering(value: z.infer<typeof offeringSchema>) {
  if (
    value.pricingModel === "quote_required" &&
    (value.price !== 0 || value.offerEnabled)
  )
    throw new ApiAuthError(
      "Quote-required services must have no online payable price or promotion",
      400,
    );
  if (
    value.offerEnabled &&
    (!value.offerName ||
      !value.discountType ||
      value.discountValue <= 0 ||
      (value.discountType === "percentage" && value.discountValue > 100) ||
      (value.discountType === "flat" && value.discountValue > value.price))
  )
    throw new ApiAuthError(
      "Check the promotion name, type and discount amount",
      400,
    );
  if (
    value.offerStartsAt &&
    value.offerEndsAt &&
    value.offerEndsAt <= value.offerStartsAt
  )
    throw new ApiAuthError("Offer end must be after its start", 400);
  return value;
}
export function validateSkills(keys: string[], previous: string[] = []) {
  const unique = [...new Set(keys)];
  if (!unique.length || unique.length > 30)
    throw new ApiAuthError("Select between one and thirty catalog skills", 400);
  const active = catalogSkills.filter(
    (skill) =>
      skill.isActive &&
      catalogCategories.some(
        (category) => category.key === skill.categoryKey && category.isActive,
      ),
  );
  if (
    unique.some(
      (key) =>
        !active.some((skill) => skill.key === key) && !previous.includes(key),
    )
  )
    throw new ApiAuthError("One or more skills are inactive or invalid", 400);
  return {
    skillKeys: unique,
    skills: unique.map(
      (key) => catalogSkills.find((skill) => skill.key === key)?.label || key,
    ),
  };
}
export const discoverySchema = z.object({
  q: text(100).default(""),
  provider: text(100).default(""),
  city: text(80).default(""),
  state: text(80).default(""),
  locality: text(100).default(""),
  pincode: z.union([pinSchema, z.literal("")]).default(""),
  serviceId: z.union([objectIdSchema, z.literal("")]).default(""),
  providerId: z.union([objectIdSchema, z.literal("")]).default(""),
  category: text(80)
    .refine(
      (value) =>
        !value ||
        value === "other" ||
        catalogCategories.some(
          (category) => category.key === value && category.isActive,
        ),
      "Choose an active category",
    )
    .default(""),
  minRating: z.coerce.number().min(0).max(5).default(0),
  sort: z
    .enum(["relevance", "rating", "price_asc", "price_desc"])
    .default("relevance"),
  page: z.coerce.number().int().min(1).max(200).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  scope: z.enum(["local", "other"]).default("local"),
});
export function parseDiscovery(request: Request) {
  return discoverySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
}
export { normalizeKey };
