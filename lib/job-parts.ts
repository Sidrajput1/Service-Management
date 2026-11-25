import { z } from "zod";
import { type Types } from "mongoose";
import Invoice from "@/models/invoice";
import PriceItem from "@/models/PriceItem";
import JobPartEvent from "@/models/job-part-event";
import type { JobPart } from "@/models/job";
import { ApiAuthError } from "./auth";
import { withAssignedJob } from "./assigned-job-transaction";
import { additionalChargeSchema } from "./job-quote-pricing";
import { requestIdSchema } from "./finance-validation";
import { requestHash } from "./finance-security";
import { objectIdSchema } from "./pagination";
import { runningJobPricing } from "./job-quotes";
import { jobRunningBill } from "./job-running-bill";
import { invoiceQuoteFields } from "./job-invoice-approval";

export const addJobPartSchema = z
  .object({
    requestId: requestIdSchema,
    partName: additionalChargeSchema.shape.description.optional(),
    qty: z.coerce.number().pipe(additionalChargeSchema.shape.qty),
    price: z.coerce
      .number()
      .pipe(additionalChargeSchema.shape.unitPrice)
      .optional(),
    priceItemId: objectIdSchema.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (part) => part.priceItemId || (part.partName && part.price !== undefined),
    "Enter a part name and unit price, or choose a catalog part.",
  );
export const changeJobPartSchema = z
  .object({
    requestId: requestIdSchema,
    expectedVersion: z.number().int().nonnegative(),
    qty: z.coerce.number().pipe(additionalChargeSchema.shape.qty),
  })
  .strict();
export const removeJobPartSchema = changeJobPartSchema.omit({ qty: true });

type Actor = { _id: Types.ObjectId; role: string; name?: string };
type Command =
  | { action: "part_added"; input: z.infer<typeof addJobPartSchema> }
  | {
      action: "part_updated";
      partId: string;
      input: z.infer<typeof changeJobPartSchema>;
    }
  | {
      action: "part_removed";
      partId: string;
      input: z.infer<typeof removeJobPartSchema>;
    };
function snapshot(part: JobPart) {
  return {
    partName: part.partName,
    qty: part.qty,
    unitPrice: part.price!,
    lineTotal: part.qty * part.price!,
    note: part.note,
  };
}

export async function changeAssignedJobPart(
  jobId: string,
  technicianId: string,
  actor: Actor,
  command: Command,
) {
  if (actor.role !== "technician")
    throw new ApiAuthError("Pro access required", 403);
  await JobPartEvent.init();
  const { requestId, ...details } = command.input;
  const hash = requestHash({
    action: command.action,
    partId: "partId" in command ? command.partId : undefined,
    ...details,
  });
  return withAssignedJob(
    jobId,
    technicianId,
    async ({ job, booking, session }) => {
      const eventId = `${jobId}:${requestId}`;
      const previous = await JobPartEvent.findById(eventId)
        .select("+requestHash")
        .session(session)
        .lean();
      if (previous) {
        if (
          previous.requestHash !== hash ||
          String(previous.actorId) !== String(actor._id)
        )
          throw new ApiAuthError(
            "This request reference was already used for different details.",
            409,
          );
        return {
          success: true,
          duplicate: true,
          partsUsed: job.partsUsed ?? [],
          runningBill: await jobRunningBill(job, booking, session),
        };
      }
      if (job.status !== "in_progress" || job.finalQuote)
        throw new ApiAuthError(
          "Parts can only be changed while this service is in progress.",
          409,
        );
      const draft = await Invoice.findOne({ jobId: job._id }).session(session);
      if (
        draft &&
        (draft.status !== "draft" ||
          draft.finalizedAt ||
          draft.razorpayCheckoutChannel ||
          draft.razorpayOrderId ||
          draft.razorpayPaymentLinkId ||
          draft.amountPaid > 0)
      )
        throw new ApiAuthError(
          "The invoice is finalized or linked to a payment. Ask support to review this bill.",
          409,
        );
      const beforePricing = await runningJobPricing(job, booking, session);
      let before: ReturnType<typeof snapshot> | undefined;
      let after: ReturnType<typeof snapshot> | undefined;
      let partId: string;
      if (command.action === "part_added") {
        if ((job.partsUsed?.length ?? 0) >= 100)
          throw new ApiAuthError(
            "This job has reached its part limit. Ask your provider to review the bill.",
            409,
          );
        const input = command.input;
        const catalog = input.priceItemId
          ? await PriceItem.findOne({
              _id: input.priceItemId,
              itemType: "part",
              isActive: true,
            })
              .session(session)
              .lean()
          : null;
        if (input.priceItemId && !catalog)
          throw new ApiAuthError(
            "This catalog part is unavailable. Refresh the part list.",
            409,
          );
        if (
          catalog &&
          input.price !== undefined &&
          input.price !== catalog.price
        )
          throw new ApiAuthError(
            "The catalog price changed. Refresh before adding the part.",
            409,
          );
        const charge = additionalChargeSchema.parse({
          chargeType: "part",
          description: catalog?.name ?? input.partName,
          qty: input.qty,
          unitPrice: catalog?.price ?? input.price,
        });
        partId = requestId;
        const part: JobPart = {
          partId,
          partName: charge.description,
          qty: charge.qty,
          price: charge.unitPrice,
          source: "on_site",
          priceItemId: catalog?._id,
          note: input.note,
        };
        job.partsUsed = [...(job.partsUsed ?? []), part];
        after = snapshot(part);
      } else {
        if ((job.partsVersion ?? 0) !== command.input.expectedVersion)
          throw new ApiAuthError(
            "The part list changed. Refresh before editing it.",
            409,
          );
        partId = command.partId;
        const index = (job.partsUsed ?? []).findIndex(
          (part) => part.partId === partId && part.source === "on_site",
        );
        if (index < 0)
          throw new ApiAuthError(
            "On-site part not found. Earlier draft charges use the provider quote review.",
            404,
          );
        const part = job.partsUsed![index];
        before = snapshot(part);
        if (command.action === "part_removed") job.partsUsed!.splice(index, 1);
        else {
          part.qty = command.input.qty;
          after = snapshot(part);
        }
      }
      job.partsVersion = (job.partsVersion ?? 0) + 1;
      const pricing = await runningJobPricing(job, booking, session);
      if (draft) {
        Object.assign(draft, invoiceQuoteFields(pricing), {
          balanceDue: pricing.grandTotal,
        });
        await draft.save({ session });
      }
      await job.save({ session });
      await JobPartEvent.create(
        [
          {
            _id: eventId,
            jobId: job._id,
            actorId: actor._id,
            actorRole: "technician",
            actorName: actor.name || "Assigned Pro",
            action: command.action,
            partId,
            before,
            after,
            totalBefore: beforePricing.grandTotal,
            totalAfter: pricing.grandTotal,
            createdAt: new Date(),
            requestHash: hash,
          },
        ],
        { session },
      );
      return {
        success: true,
        duplicate: false,
        partsUsed: job.partsUsed,
        runningBill: await jobRunningBill(job, booking, session),
      };
    },
  );
}
