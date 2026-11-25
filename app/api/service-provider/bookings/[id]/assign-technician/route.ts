import mongoose from "mongoose";
import { z } from "zod";
import { assertFinanceWrite } from "@/lib/finance-security";
import { newJobOtp } from "@/lib/job-start-otp";
import {
  assignmentWindow,
  requireAssignmentWindow,
  reserveProWindow,
  scheduleDateSchema,
} from "@/lib/job-scheduling";
import { requireProvider } from "@/lib/service-provider";
import { ApiAuthError } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
import { canPerformService } from "@/lib/marketplace-policy.mjs";
import { objectIdSchema } from "@/lib/pagination";
import Booking from "@/models/booking";
import Job from "@/models/job";
import Technician from "@/models/technician";
import ServiceOffering from "@/models/ServiceOffering";
import PriceItem from "@/models/PriceItem";
import { commissionForBooking } from "@/lib/finance-commission";

export const runtime = "nodejs";
const assignmentSchema = z
  .object({
    technicianId: objectIdSchema,
    scheduledAt: scheduleDateSchema.optional(),
    scheduledEndAt: scheduleDateSchema.optional(),
  })
  .strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { provider } = await requireProvider();
    assertFinanceWrite(request);
    const id = objectIdSchema.parse((await params).id);
    const input = assignmentSchema.parse(await request.json());
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const booking = await Booking.findOne({
          _id: id,
          serviceProviderId: provider._id,
        })
          .select("+commissionSnapshot")
          .session(session);
        if (!booking) throw new ApiAuthError("Booking not found", 404);
        if (!["confirmed", "assigned"].includes(booking.status))
          throw new ApiAuthError("This booking cannot be assigned", 409);
        if (
          await Job.exists({
            bookingId: booking._id,
          }).session(session)
        )
          throw new ApiAuthError("This booking already has a job", 409);
        const pro = await Technician.findOne({
          _id: input.technicianId,
          serviceProviderId: provider._id,
          isActive: true,
          status: { $ne: "on_leave" },
        }).session(session);
        if (!pro)
          throw new ApiAuthError("Pro is not available for this business", 409);
        let required = booking.requiredSkillKeys || [];
        if (!required.length) {
          const offering = await ServiceOffering.findById(
            booking.serviceOfferingId,
          )
            .select("priceItemId")
            .session(session);
          const item = offering
            ? await PriceItem.findById(offering.priceItemId)
                .select("skillKeys")
                .session(session)
            : null;
          required = item?.skillKeys || [];
        }
        if (!canPerformService(pro.skillKeys, required))
          throw new ApiAuthError(
            "Select a Pro with a catalog skill required for this service",
            400,
          );
        if (
          booking.scheduledAt &&
          input.scheduledAt &&
          +new Date(input.scheduledAt) !== +booking.scheduledAt
        )
          throw new ApiAuthError(
            "Use the booking's scheduled start time.",
            409,
          );
        const window = requireAssignmentWindow(
          assignmentWindow(booking, null, input),
        );
        await reserveProWindow(pro._id, booking._id, window, session);
        if (!booking.commissionSnapshot && booking.serviceOfferingId)
          booking.commissionSnapshot = await commissionForBooking(
            provider._id,
            booking.serviceOfferingId,
            session,
          );
        const [job] = await Job.create(
          [
            {
              bookingId: booking._id,
              serviceProviderId: provider._id,
              technicianId: pro._id,
              assignedBy: provider.ownerId,
              scheduledAt: window.start,
              scheduledEndAt: window.end,
              status: "assigned",
              paymentStatus: "unbilled",
              proofRequired: true,
              ...newJobOtp(window.start),
            },
          ],
          { session },
        );
        booking.technicianId = pro._id;
        booking.scheduledAt = window.start;
        booking.status = "assigned";
        await booking.save({ session });
        return {
          job: {
            id: job._id,
            bookingId: job.bookingId,
            technicianId: job.technicianId,
            serviceProviderId: job.serviceProviderId,
            status: job.status,
          },
          booking: { id: booking._id, status: booking.status },
        };
      });
      return privateJson({ success: true, ...result });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    return apiFailure(error);
  }
}
