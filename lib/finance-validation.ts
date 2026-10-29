import { z } from "zod";
import { objectIdSchema } from "./pagination";
const reason = z.string().trim().min(5).max(1000);
export const requestIdSchema = z.string().uuid();
export const billActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("submit"),
      requestId: requestIdSchema,
      invoiceVersion: z.number().int().positive(),
      paymentMode: z.enum(["cash", "direct_upi", "servizato_online"]),
      collectedPaise: z.number().int().nonnegative(),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("confirm"),
      requestId: requestIdSchema,
      invoiceVersion: z.number().int().positive(),
      grossPaise: z.number().int().nonnegative(),
      paymentMode: z.enum(["cash", "direct_upi", "servizato_online"]),
      directPaymentReceived: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("dispute"),
      requestId: requestIdSchema,
      invoiceVersion: z.number().int().positive(),
      reason,
    })
    .strict(),
]);
export const payoutInputSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("bank"),
      holderName: z.string().trim().min(2).max(120),
      accountNumber: z.string().regex(/^\d{9,18}$/),
      ifsc: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
      bankName: z.string().trim().min(2).max(100),
      expectedVersion: z.number().int().nonnegative(),
      requestId: requestIdSchema,
    })
    .strict(),
  z
    .object({
      method: z.literal("upi"),
      holderName: z.string().trim().min(2).max(120),
      upiId: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9._-]{2,100}@[a-z0-9.-]{2,60}$/),
      expectedVersion: z.number().int().nonnegative(),
      requestId: requestIdSchema,
    })
    .strict(),
]);
export const providerFinanceActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("accept_terms"),
      policyId: objectIdSchema,
      requestId: requestIdSchema,
      acknowledged: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("create_collection_link"),
      requestId: requestIdSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("reconcile_collection"),
      collectionId: objectIdSchema,
      requestId: requestIdSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("dispute_ledger"),
      ledgerId: objectIdSchema,
      requestId: requestIdSchema,
      reason,
    })
    .strict(),
]);
export const adminFinanceActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("record_direct_refund"),
      requestId: requestIdSchema,
      ledgerId: objectIdSchema,
      amountPaise: z.number().int().positive(),
      paidAt: z.string().datetime(),
      reference: z.string().trim().min(5).max(100),
      reason,
      acknowledged: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("record_manual_collection"),
      requestId: requestIdSchema,
      ledgerId: objectIdSchema,
      amountPaise: z.number().int().positive(),
      paidAt: z.string().datetime(),
      reference: z.string().trim().min(5).max(100),
      reason,
      acknowledged: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("create_policy"),
      requestId: requestIdSchema,
      scope: z.enum(["global", "category", "provider"]),
      scopeKey: z.string().trim().max(100),
      rateBps: z.number().int().min(0).max(10000),
      effectiveAt: z.string().datetime(),
      collectionDays: z.number().int().min(1).max(90),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("record_payout"),
      requestId: requestIdSchema,
      ledgerId: objectIdSchema,
      amountPaise: z.number().int().positive(),
      profileVersion: z.number().int().positive(),
      paidAt: z.string().datetime(),
      reference: z.string().trim().min(5).max(100),
      reason,
      acknowledged: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("review_payout"),
      requestId: requestIdSchema,
      providerId: objectIdSchema,
      expectedVersion: z.number().int().positive(),
      status: z.enum(["verified", "changes_requested"]),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("reveal_payout"),
      requestId: requestIdSchema,
      providerId: objectIdSchema,
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("review_bill"),
      requestId: requestIdSchema,
      ledgerId: objectIdSchema,
      resolution: z.enum([
        "request_confirmation",
        "verified_online",
        "verified_direct",
      ]),
      reference: z.string().trim().max(100).optional(),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("adjust_ledger"),
      requestId: requestIdSchema,
      ledgerId: objectIdSchema,
      commissionDeltaPaise: z.number().int(),
      payoutDeltaPaise: z.number().int(),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("create_collection_link"),
      requestId: requestIdSchema,
      providerId: objectIdSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("reconcile_collection"),
      requestId: requestIdSchema,
      collectionId: objectIdSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("cancel_collection_link"),
      requestId: requestIdSchema,
      collectionId: objectIdSchema,
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("prepare_reminders"),
      requestId: requestIdSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("review_cancellation"),
      requestId: requestIdSchema,
      caseId: objectIdSchema,
      status: z.enum([
        "open",
        "under_review",
        "no_issue",
        "confirmed_issue",
        "action_taken",
      ]),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("correct_bill"),
      requestId: requestIdSchema,
      ledgerId: objectIdSchema,
      reason,
      discountAmount: z.number().nonnegative(),
      taxPercent: z.number().min(0).max(100),
      items: z
        .array(
          z.object({
            itemType: z.enum(["service", "part", "visit", "discount", "other"]),
            description: z.string().trim().min(1).max(300),
            qty: z.number().positive(),
            unitPrice: z.number().nonnegative(),
            taxable: z.boolean(),
          }),
        )
        .min(1)
        .max(100),
    })
    .strict(),
]);
