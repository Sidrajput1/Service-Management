type TimelineStep = {
    key:string;
    label:string;
    done:boolean;
    active:boolean;
    date?:string;
    note?:string;
};

function toIsoString(date?:Date | string | null){
     if (!date) return undefined;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
};

export function buildCustomerTimeline(input:{
    lead?:any;
    booking?:any;
    job?:any;
    invoice?:any;
    payment?:any;
}){
    const {lead,booking,job,invoice,payment} = input;

    const steps : TimelineStep[] = [
        {
            key:"lead_created",
            label:"Service request Submited",
            done:!!lead || !!booking,
            active:!booking,
            date: toIsoString(lead?.createdAt || booking?.createdAt),
            note:lead?.source ? `Source:${lead.source}` : "Request recieve by system"
        },
        {
      key: "booking_confirmed",
      label: "Booking confirmed",
      done: ["confirmed", "assigned", "rescheduled"].includes(booking?.status),
      active: booking?.status === "pending",
      date: toIsoString(booking?.createdAt),
      note: booking?.scheduledAt ? `Scheduled for ${new Date(booking.scheduledAt).toLocaleString()}` : undefined,
    },
    {
      key: "technician_assigned",
      label: "Technician assigned",
      done: ["assigned", "accepted", "arrived", "otp_verified", "in_progress", "on_hold", "completed"].includes(job?.status),
      active: booking?.status === "assigned" && !job?.technicianId,
      date: toIsoString(job?.createdAt),
      note: job?.technicianId?.userId?.name ? `Assigned to ${job.technicianId.userId.name}` : undefined,
    },
    {
      key: "technician_accepted",
      label: "Technician accepted job",
      done: ["accepted", "arrived", "otp_verified", "in_progress", "on_hold", "completed"].includes(job?.status),
      active: job?.status === "assigned",
      date: toIsoString(job?.acceptedAt),
      note: job?.acceptedAt ? "Technician accepted the assignment" : undefined,
    },
    {
      key: "technician_arrived",
      label: "Technician reached customer",
      done: ["arrived", "otp_verified", "in_progress", "on_hold", "completed"].includes(job?.status),
      active: job?.status === "accepted",
      date: toIsoString(job?.arrivedAt),
      note: job?.arrivedAt ? "Technician marked arrival" : undefined,
    },
    {
      key: "service_started",
      label: "Service started",
      done: ["otp_verified", "in_progress", "on_hold", "completed"].includes(job?.status),
      active: job?.status === "arrived",
      date: toIsoString(job?.startTime || job?.customerOtpVerifiedAt),
      note: job?.customerOtpVerifiedAt ? "OTP verified successfully" : undefined,
    },
    {
      key: "service_completed",
      label: "Service completed",
      done: job?.status === "completed",
      active: ["in_progress", "on_hold"].includes(job?.status),
      date: toIsoString(job?.endTime),
      note: job?.endTime ? "Work completed by technician" : undefined,
    },
    {
      key: "invoice_issued",
      label: "Invoice issued",
      done: !!invoice,
      active: !!job && !invoice,
      date: toIsoString(invoice?.issuedAt || invoice?.createdAt),
      note: invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : undefined,
    },
    {
      key: "payment_received",
      label: "Payment received",
      done: invoice?.status === "paid" || Number(invoice?.balanceDue || 0) === 0,
      active: !!invoice && Number(invoice?.balanceDue || 0) > 0,
      date: toIsoString(payment?.paidAt || invoice?.paymentReceivedAt),
      note: payment ? `Paid via ${payment.mode || "payment"}` : undefined,
    },
    ];

    return steps;
}