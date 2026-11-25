import { z } from "zod";
import type { ClientSession, Types } from "mongoose";
import Booking, { type IBooking } from "@/models/booking";
import Job, { type IJob } from "@/models/job";
import Technician from "@/models/technician";
import { ApiAuthError } from "./auth";

export const activeScheduleStatuses = [
  "scheduled",
  "assigned",
  "enroute",
  "arrived",
  "otp_verified",
  "in_progress",
  "on_hold",
] as const;
export const scheduleDateSchema = z.iso.datetime({ offset: true });
type Window = { start: Date; end: Date };
type BookingSchedule = Pick<IBooking, "scheduledAt" | "timeWindow">;
type JobSchedule = Pick<IJob, "scheduledAt" | "scheduledEndAt">;

function windowBetween(start?: Date, end?: Date): Window | null {
  return start &&
    end &&
    Number.isFinite(+start) &&
    Number.isFinite(+end) &&
    start < end
    ? { start, end }
    : null;
}

function bookingWindow(booking?: BookingSchedule) {
  return windowBetween(booking?.timeWindow?.from, booking?.timeWindow?.to);
}

function savedWindow(job: JobSchedule, booking?: BookingSchedule) {
  const saved = windowBetween(job.scheduledAt, job.scheduledEndAt);
  if (saved || job.scheduledEndAt) return saved;
  const legacy = bookingWindow(booking);
  if (!legacy) return null;
  return !job.scheduledAt ||
    (job.scheduledAt >= legacy.start && job.scheduledAt < legacy.end)
    ? legacy
    : null;
}

export function assignmentWindow(
  booking: BookingSchedule,
  existing: JobSchedule | null,
  input: { scheduledAt?: string; scheduledEndAt?: string },
) {
  const booked = bookingWindow(booking);
  if (!input.scheduledAt && !input.scheduledEndAt && existing?.scheduledEndAt)
    return savedWindow(existing, booking);

  const start = input.scheduledAt
    ? new Date(input.scheduledAt)
    : (existing?.scheduledAt ?? booking.scheduledAt ?? booked?.start);
  const canReuseEnd =
    !input.scheduledAt || Number(start) === Number(existing?.scheduledAt);
  const end = input.scheduledEndAt
    ? new Date(input.scheduledEndAt)
    : ((canReuseEnd ? existing?.scheduledEndAt : undefined) ?? booked?.end);
  const window = windowBetween(start, end);
  if (!window && input.scheduledEndAt)
    throw new ApiAuthError(
      "Enter a service end time after the start time.",
      400,
    );
  if (
    window &&
    booked &&
    (window.start < booked.start || window.end > booked.end)
  )
    throw new ApiAuthError(
      "Choose a service window within the confirmed booking slot.",
      409,
    );
  return window;
}

export async function assertProCanStart(
  technicianId: Types.ObjectId,
  jobId: Types.ObjectId,
  session: ClientSession,
) {
  const fence = await Technician.updateOne(
    {
      _id: technicianId,
      isActive: { $ne: false },
      status: { $ne: "on_leave" },
    },
    { $inc: { __v: 1 } },
    { session },
  );
  if (fence.matchedCount !== 1)
    throw new ApiAuthError(
      "This Pro is unavailable. Ask your provider to review the assignment.",
      409,
    );
  if (
    await Job.exists({
      _id: { $ne: jobId },
      technicianId,
      status: { $in: ["otp_verified", "in_progress", "on_hold"] },
    }).session(session)
  )
    throw new ApiAuthError(
      "Finish or resolve your current service before starting another job.",
      409,
    );
}

export function requireAssignmentWindow(window: Window | null): Window {
  if (!window)
    throw new ApiAuthError(
      "Set a reliable service start and end time before assigning this job.",
      409,
    );
  return window;
}

export function windowsOverlap(first: Window, second: Window) {
  return first.start < second.end && first.end > second.start;
}

export async function proHasReservations(
  technicianId: Types.ObjectId,
  session: ClientSession,
) {
  if (
    await Job.exists({
      technicianId,
      status: { $in: activeScheduleStatuses },
    }).session(session)
  )
    return true;
  const bookings = await Booking.find({
    technicianId,
    status: { $in: ["confirmed", "assigned", "rescheduled"] },
  })
    .select("_id")
    .session(session)
    .lean();
  if (!bookings.length) return false;
  const linked = await Job.find({
    technicianId,
    bookingId: { $in: bookings.map((booking) => booking._id) },
  })
    .select("bookingId")
    .session(session)
    .lean();
  const linkedIds = new Set(linked.map((job) => String(job.bookingId)));
  return bookings.some((booking) => !linkedIds.has(String(booking._id)));
}

export async function reserveProWindow(
  technicianId: Types.ObjectId,
  bookingId: Types.ObjectId,
  window: Window,
  session: ClientSession,
  existingJobId?: Types.ObjectId,
) {
  // Competing assignments write the same Pro document before scanning reservations.
  // MongoDB retries the whole snapshot on write conflict, including the overlap check.
  const fence = await Technician.updateOne(
    {
      _id: technicianId,
      isActive: { $ne: false },
      status: { $ne: "on_leave" },
    },
    { $inc: { __v: 1 }, $set: { status: "busy" } },
    { session },
  );
  if (fence.matchedCount !== 1)
    throw new ApiAuthError(
      "This Pro is unavailable. Refresh before assigning.",
      409,
    );

  const jobs = await Job.find({
    technicianId,
    status: { $in: activeScheduleStatuses },
    ...(existingJobId ? { _id: { $ne: existingJobId } } : {}),
  })
    .select("bookingId scheduledAt scheduledEndAt")
    .session(session)
    .lean();
  const legacyBookingIds = jobs
    .filter((job) => !job.scheduledEndAt)
    .map((job) => job.bookingId);
  const bookings = await Booking.find({
    $or: [
      { _id: { $in: legacyBookingIds } },
      {
        technicianId,
        status: { $in: ["confirmed", "assigned", "rescheduled"] },
        _id: { $ne: bookingId },
      },
    ],
  })
    .select("timeWindow scheduledAt technicianId status")
    .session(session)
    .lean();
  const byId = new Map(
    bookings.map((booking) => [String(booking._id), booking]),
  );

  function check(existing: Window | null) {
    if (!existing)
      throw new ApiAuthError(
        "This Pro has an active reservation with no reliable time window. Confirm its start and end before assigning another job.",
        409,
      );
    if (windowsOverlap(window, existing))
      throw new ApiAuthError(
        "This Pro already has a job in the proposed service window.",
        409,
      );
  }
  const activeBookingIds = new Set<string>();
  for (const job of jobs) {
    const id = String(job.bookingId);
    activeBookingIds.add(id);
    check(savedWindow(job, byId.get(id)));
  }
  const bookingOnly = bookings.filter((booking) => {
    const id = String(booking._id);
    return (
      id !== String(bookingId) &&
      !activeBookingIds.has(id) &&
      String(booking.technicianId) === String(technicianId) &&
      ["confirmed", "assigned", "rescheduled"].includes(booking.status)
    );
  });
  // Closed linked jobs release their slots. An orphaned assignment still reserves time.
  if (bookingOnly.length) {
    const linked = await Job.find({
      technicianId,
      bookingId: { $in: bookingOnly.map((booking) => booking._id) },
    })
      .select("bookingId")
      .session(session)
      .lean();
    const linkedIds = new Set(linked.map((job) => String(job.bookingId)));
    for (const booking of bookingOnly.filter(
      (row) => !linkedIds.has(String(row._id)),
    ))
      check(bookingWindow(booking));
  }
}
