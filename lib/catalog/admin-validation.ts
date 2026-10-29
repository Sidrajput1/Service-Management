import { z } from "zod";
import { catalogCategories, pricingUnits } from "./definition.mjs";
import { text } from "@/lib/marketplace-validation";
const suggested = z
  .object({
    amount: z.number().finite().min(0).max(1000000),
    currency: z.literal("INR"),
    unit: z.string().refine((value) => pricingUnits.includes(value)),
    city: text(80).optional(),
    sourceUrl: z
      .url()
      .refine((value) => value.startsWith("https://"))
      .optional(),
    checkedAt: z.iso.date().optional(),
    kind: z.enum(["configured", "public_listing"]),
    qualification: text(1000),
  })
  .refine(
    (value) =>
      value.kind !== "public_listing" ||
      Boolean(
        value.city && value.sourceUrl && value.checkedAt && value.qualification,
      ),
    "Researched prices need city, source, date and scope qualifications",
  );
export const catalogAdminSchema = z.object({
  itemType: z.enum(["service", "part", "visit", "other"]),
  name: text(150).pipe(z.string().min(2)),
  price: z.coerce.number().finite().min(0).max(1000000),
  unit: text(40).optional(),
  taxPercent: z.coerce.number().finite().min(0).max(100).optional(),
  description: text(2000).optional(),
  isActive: z.boolean().optional(),
  catalogKey: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,79}$/)
    .optional(),
  categoryKey: z
    .string()
    .refine(
      (value) =>
        catalogCategories.some(
          (category) => category.key === value && category.isActive,
        ) || value === "other",
    )
    .optional(),
  skillKeys: z.array(z.string().max(100)).max(30).optional(),
  currency: z.literal("INR").optional(),
  suggestedPrice: suggested.nullable().optional(),
});
