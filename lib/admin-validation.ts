import { z } from "zod";
import { objectIdSchema } from "./pagination";
import { normalizeText } from "./marketplace-policy.mjs";
import { reasonRequired } from "./moderation-policy.mjs";
const decisionFields = {
  requestId: z.uuid(),
  expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  reason: z
    .string()
    .transform(normalizeText)
    .pipe(z.string().max(1000))
    .default(""),
};
export const providerDecisionSchema = z
  .object({
    ...decisionFields,
    action: z.enum([
      "approve",
      "request_changes",
      "reject",
      "suspend",
      "restore",
    ]),
  })
  .superRefine((value, ctx) => {
    if (reasonRequired(value.action) && value.reason.length < 5)
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Give a reason of at least five characters.",
      });
  });
export const offeringDecisionSchema = z
  .object({
    ...decisionFields,
    action: z.enum(["approve", "request_changes", "reject"]),
  })
  .superRefine((value, ctx) => {
    if (reasonRequired(value.action) && value.reason.length < 5)
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Give a reason of at least five characters.",
      });
  });
export const resubmitSchema = z.object({
  requestId: decisionFields.requestId,
  expectedVersion: decisionFields.expectedVersion,
});
export const catalogRequestMeta = z.object({
  requestId: z.uuid(),
  expectedVersion: decisionFields.expectedVersion.optional(),
});
export const adminListSchema = z.object({
  q: z.string().transform(normalizeText).pipe(z.string().max(100)).default(""),
  cursor: z.union([objectIdSchema, z.literal("")]).default(""),
  direction: z.enum(["next", "previous"]).default("next"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.string().max(40).default(""),
  providerId: z.union([objectIdSchema, z.literal("")]).default(""),
  providerName: z
    .string()
    .transform(normalizeText)
    .pipe(z.string().max(100))
    .default(""),
  includeDrafts: z.enum(["true", "false"]).default("false"),
  category: z.string().max(80).default(""),
  type: z.enum(["service", "part", "visit", "other", "all"]).default("service"),
});
export type AdminListInput = z.infer<typeof adminListSchema>;
export type ProviderDecisionInput = z.infer<typeof providerDecisionSchema>;
export type OfferingDecisionInput = z.infer<typeof offeringDecisionSchema>;
