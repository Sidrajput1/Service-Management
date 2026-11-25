import type { ClientSession } from "mongoose";
import { z } from "zod";
import ServiceOffering from "@/models/ServiceOffering";
import type { IBooking } from "@/models/booking";
import type { IJob } from "@/models/job";
import type { QuoteLine, QuotePricing } from "@/models/job-quote";
import { ApiAuthError } from "./auth";
import { calculateInvoiceTotals } from "./billing/invoice-totals";
import { paise } from "./finance-policy.mjs";

export const additionalChargeSchema = z
  .object({
    chargeType: z.enum(["part", "labour", "visit", "other"]),
    description: z.string().trim().min(1).max(300),
    qty: z.number().positive().max(1000000),
    unitPrice: z
      .number()
      .nonnegative()
      .max(10000000)
      .refine(
        (amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001,
        "Use at most two decimal places.",
      ),
  })
  .strict();
type Additional = z.infer<typeof additionalChargeSchema>;
type BookingPricing = Pick<
  IBooking,
  "pricing" | "estimatedPrice" | "serviceOfferingId" | "serviceType"
>;

export async function bookingQuote(
  booking: BookingPricing,
  session?: ClientSession,
) {
  const saved = booking.pricing;
  const knownAmount = saved?.finalPrice ?? booking.estimatedPrice;
  const serviceAmount = Number(knownAmount ?? 0);
  const discountAmount = Number(saved?.discountAmount ?? 0);
  const offering =
    saved?.taxPercent == null && booking.serviceOfferingId
      ? await ServiceOffering.findById(booking.serviceOfferingId)
          .select("name taxPercent")
          .session(session ?? null)
          .lean()
      : null;
  const taxPercent = Number(saved?.taxPercent ?? offering?.taxPercent ?? 18);
  const qty =
    saved?.pricingModel === "per_unit" ? Number(saved.quantity || 1) : 1;
  if (
    ![serviceAmount, discountAmount, taxPercent, qty].every(Number.isFinite) ||
    serviceAmount < 0 ||
    discountAmount < 0 ||
    taxPercent < 0 ||
    qty <= 0
  )
    throw new ApiAuthError("The booking price needs a billing review.", 409);
  const items: QuoteLine[] = [
    {
      chargeType: "service",
      itemType: "service",
      description: booking.serviceType || offering?.name || "Service",
      qty,
      unitPrice: serviceAmount / qty,
      taxable: true,
      amount: serviceAmount,
    },
  ];
  const pricing: QuotePricing = {
    items,
    discountAmount,
    serviceBeforeDiscount: serviceAmount + discountAmount,
    taxPercent,
    ...calculateInvoiceTotals(items, taxPercent),
  };
  // Marketplace checkout displays the discounted price plus the saved GST rate.
  // A legacy estimate without tax disclosure authorizes only the displayed amount.
  const approvedPayable =
    knownAmount == null
      ? null
      : saved?.taxPercent != null
        ? pricing.grandTotal
        : Math.round(serviceAmount * 100) / 100;
  return { pricing, approvedPayable };
}

export function priceRevisedQuote(
  base: QuotePricing,
  extras: Additional[],
): QuotePricing {
  const items: QuoteLine[] = [
    base.items[0],
    ...extras.map(
      (extra): QuoteLine => ({
        ...extra,
        itemType: extra.chargeType === "labour" ? "other" : extra.chargeType,
        amount: extra.qty * extra.unitPrice,
        taxable: true,
      }),
    ),
  ];
  const totals = calculateInvoiceTotals(items, base.taxPercent);
  if (!Number.isSafeInteger(Math.round(totals.grandTotal * 100)))
    throw new ApiAuthError("Use a smaller payable amount.", 400);
  return { ...base, items, ...totals };
}

export function requiresCustomerApproval(
  proposed: number,
  approved: number | null,
) {
  return approved === null || paise(proposed) > paise(approved);
}

export async function unquotedCompletionPricing(
  job: IJob,
  booking: IBooking,
  session?: ClientSession,
) {
  if (job.partsUsed?.some((part) => Number(part.price) > 0))
    throw new ApiAuthError(
      "This completed job has unreviewed additional charges. Ask support for a billing review.",
      409,
    );
  const base = await bookingQuote(booking, session);
  if (requiresCustomerApproval(base.pricing.grandTotal, base.approvedPayable))
    throw new ApiAuthError(
      "This booking needs customer approval before its payable amount can be billed.",
      409,
    );
  return base.pricing;
}
