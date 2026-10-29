import { requireTechnicianProfile } from "@/lib/technician";
import { apiFailure, privateJson } from "@/lib/api-response";
import { objectIdSchema } from "@/lib/pagination";
import {
  confirmedDestination,
  serviceAddressForViewer,
} from "@/lib/service-location.mjs";
import { arrivalConfig } from "@/lib/arrival-policy.mjs";
import { deliverArrival } from "@/lib/arrival-delivery";
import Job from "@/models/job";
import "@/models/booking";
import "@/models/customer";
import "@/models/technician";
import "@/models/jobProof";
const activeStatuses = [
  "scheduled",
  "assigned",
  "enroute",
  "arrived",
  "otp_verified",
  "in_progress",
  "on_hold",
  "completed",
];
function logDetailFailure(error: unknown, stage: string) {
  if (
    error &&
    typeof error === "object" &&
    (("status" in error &&
      [400, 401, 403, 404, 409].includes(Number(error.status))) ||
      ("name" in error && error.name === "ZodError"))
  )
    return;
  const name = error instanceof Error ? error.name : "";
  const category = [
    "MongoServerError",
    "MongoNetworkError",
    "MongooseServerSelectionError",
    "MissingSchemaError",
    "CastError",
    "TypeError",
  ].includes(name)
    ? name
    : "UnexpectedError";
  // Never log the error message/stack: driver errors can contain private documents or credentials.
  console.error("Technician job detail failed.", { stage, category });
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let stage = "authentication";
  try {
    const { tech } = await requireTechnicianProfile();
    stage = "request_validation";
    const id = objectIdSchema.parse((await params).id);
    stage = "job_read";
    const job = await Job.findOne({ _id: id, technicianId: tech._id })
      .select(
        "bookingId serviceProviderId technicianId invoiceId scheduledAt status paymentStatus paymentReceivedAt paymentMethod startTime endTime proofRequired proofSubmittedAt proofIds partsUsed notes acceptedAt arrivedAt customerOtpVerifiedAt createdAt updatedAt",
      )
      .populate({
        path: "bookingId",
        select:
          "serviceType subService customerId status scheduledAt timeWindow technicianId estimatedPrice pricing notes address.addressLine address.locality address.city address.state address.pincode +address.location +address.locationConfirmation",
        options: { includeServiceLocation: true },
        populate: { path: "customerId", select: "name phone" },
      })
      .populate({
        path: "proofIds",
        match: { jobId: id },
        select: "type url thumbnailUrl createdAt metadata.note",
      })
      .lean();
    if (!job) return privateJson({ error: "Assigned job not found" }, 404);
    stage = "response_serialization";
    // Lean reads do not apply the Job schema's default required-proof flag.
    job.proofRequired = job.proofRequired !== false;
    const booking = job.bookingId as unknown as {
      address?: import("@/models/booking").IBooking["address"];
      status: string;
      technicianId?: unknown;
    };
    const active =
      booking?.status === "assigned" &&
      String(booking.technicianId) === String(tech._id) &&
      [
        "assigned",
        "enroute",
        "arrived",
        "otp_verified",
        "in_progress",
        "on_hold",
      ].includes(job.status);
    let reason: string | undefined;
    if (!booking)
      reason =
        "The service booking is unavailable. Contact your service provider.";
    else if (booking.status === "cancelled")
      reason = "This booking was cancelled. Workflow actions are unavailable.";
    else if (String(booking.technicianId) !== String(tech._id))
      reason = "This booking is no longer assigned to you.";
    else if (booking.status !== "assigned")
      reason = "The booking is not currently assigned for service.";
    else if (tech.isActive === false)
      reason = "Your Pro profile is inactive. Contact your service provider.";
    else if (!activeStatuses.includes(job.status))
      reason = "This job is closed or has an unsupported workflow status.";
    const permitted = !reason;
    const workflow = {
      access: permitted ? "active" : "read_only",
      reason,
      canAccept: permitted && ["scheduled", "assigned"].includes(job.status),
      canArrive:
        permitted &&
        job.status === "enroute" &&
        ["available", "busy"].includes(tech.status),
      canStart: permitted && job.status === "arrived",
      canUploadProof:
        permitted && ["arrived", "in_progress", "on_hold"].includes(job.status),
      canManageParts:
        permitted &&
        ["otp_verified", "in_progress", "on_hold"].includes(job.status),
      canComplete:
        permitted &&
        ["in_progress", "on_hold"].includes(job.status) &&
        (!job.proofRequired || Boolean(job.proofIds?.length)),
      canRetryInvoice:
        permitted && job.status === "completed" && !job.invoiceId,
    };
    const destinationAvailable = Boolean(
      confirmedDestination(booking?.address),
    );
    if (booking)
      booking.address = serviceAddressForViewer(booking.address, active);
    let config;
    try {
      config = arrivalConfig(process.env);
    } catch {
      config = null;
    }
    if (job.arrivedAt) await deliverArrival(id).catch(() => undefined);
    return privateJson({
      job,
      workflow,
      journey: {
        canTrack:
          active &&
          ["available", "busy"].includes(tech.status) &&
          job.status === "enroute" &&
          destinationAvailable &&
          Boolean(config),
        destinationAvailable: active && destinationAvailable,
        clientIntervalMs: Math.max(
          10000,
          config?.minReadingIntervalMs || 10000,
        ),
        requiredReadings: config?.requiredReadings || 2,
        radiusMeters: config?.radiusMeters || 100,
      },
    });
  } catch (error) {
    logDetailFailure(error, stage);
    return apiFailure(error);
  }
}
