export const technicianJobStatuses = [
  "scheduled",
  "assigned",
  "enroute",
  "arrived",
  "otp_verified",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];
const labels = {
  scheduled: "Scheduled",
  assigned: "Assigned",
  enroute: "En route",
  arrived: "Arrived",
  otp_verified: "OTP verified",
  in_progress: "Work in progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};
export function technicianStatusLabel(status) {
  return (
    labels[status] ||
    (typeof status === "string" && status
      ? status.replaceAll("_", " ")
      : "Status unavailable")
  );
}
export function technicianProofCount(job) {
  return Array.isArray(job?.proofIds) ? job.proofIds.length : 0;
}
export function technicianInvoiceId(job) {
  return typeof job?.invoiceId === "string"
    ? job.invoiceId
    : job?.invoiceId?._id || null;
}
export function technicianWorkflow(job, permissions) {
  const status = job?.status,
    known = technicianJobStatuses.includes(status),
    proofCount = technicianProofCount(job);
  const proofMissing = job?.proofRequired === true && proofCount === 0;
  const active =
    known &&
    status !== "cancelled" &&
    job?.bookingId &&
    job.bookingId.status !== "cancelled" &&
    permissions?.access === "active";
  let blockedReason =
    permissions?.reason ||
    (!job?.bookingId
      ? "The booking attached to this job is unavailable. Contact your service provider."
      : !known
        ? "This saved job status needs review by your service provider."
        : status === "cancelled" || job.bookingId.status === "cancelled"
          ? "This job or its booking was cancelled. Workflow actions are closed."
          : !permissions
            ? "Workflow permissions are unavailable. Refresh the job before continuing."
            : permissions.access !== "active"
              ? "This assignment is read only. Contact your service provider if the assignment has changed."
              : "");
  let action = null;
  if (active) {
    if (["scheduled", "assigned"].includes(status) && permissions.canAccept)
      action = {
        key: "accept",
        label: "Accept & start journey",
        busyLabel: "Accepting job…",
        description:
          "Accept your assignment when you are ready to travel. The saved job will move to En route after confirmation.",
      };
    else if (status === "enroute" && permissions.canArrive)
      action = {
        key: "arrive",
        label: "I've arrived",
        busyLabel: "Confirming arrival…",
        description:
          "Use this when you reach the actual service address. The customer OTP is still required before work can begin.",
      };
    else if (status === "arrived" && permissions.canStart)
      action = {
        key: "start",
        label: "Verify OTP & start work",
        busyLabel: "Verifying OTP…",
        description:
          "Ask the customer for the OTP shown in their booking. Work starts only after the server verifies it.",
      };
    else if (
      ["in_progress", "on_hold"].includes(status) &&
      proofMissing &&
      permissions.canUploadProof
    )
      action = {
        key: "proof",
        label: "Upload service proof",
        busyLabel: "Uploading proof…",
        description:
          "At least one saved proof is required before completion. Add clear photos of the service work below.",
      };
    else if (
      ["in_progress", "on_hold"].includes(status) &&
      !proofMissing &&
      permissions.canComplete
    )
      action = {
        key: "complete",
        label: "Complete service & create invoice",
        busyLabel: "Completing service…",
        description:
          "Confirm the work and recorded parts are complete. The server closes the job and generates its invoice.",
      };
    else if (
      status === "completed" &&
      !technicianInvoiceId(job) &&
      permissions.canRetryInvoice
    )
      action = {
        key: "invoice",
        label: "Retry invoice generation",
        busyLabel: "Preparing invoice…",
        description:
          "The service is already completed. Retry the existing invoice operation to finish billing.",
      };
    if (!action && status === "otp_verified")
      blockedReason =
        "OTP verification is recorded, but this saved job has not entered Work in progress. Ask your service provider to review the workflow.";
    else if (!action && status !== "completed" && !blockedReason)
      blockedReason =
        "No workflow action is currently available. Refresh the job or contact your service provider.";
  }
  const index = ["scheduled", "assigned"].includes(status)
    ? 0
    : status === "enroute"
      ? 1
      : status === "arrived"
        ? 2
        : ["otp_verified", "in_progress", "on_hold"].includes(status)
          ? 3
          : status === "completed"
            ? 5
            : -1;
  const evidence = [
    Boolean(job?.acceptedAt),
    Boolean(job?.arrivedAt),
    Boolean(job?.customerOtpVerifiedAt),
    Boolean(job?.endTime),
    proofCount > 0,
    status === "completed",
  ];
  const stages = [
    {
      key: "assignment",
      label: "Assignment",
      detail: "Accept your assigned job",
    },
    {
      key: "journey",
      label: "Journey",
      detail: "Travel to the service address",
    },
    {
      key: "arrival",
      label: "Arrival & OTP",
      detail: "Confirm arrival, then verify the customer OTP",
    },
    {
      key: "work",
      label: "Service work",
      detail:
        status === "on_hold"
          ? "Work is on hold"
          : "Carry out the agreed service",
    },
    {
      key: "proof",
      label: "Service proof",
      detail: proofCount
        ? `${proofCount} saved ${proofCount === 1 ? "proof" : "proofs"}`
        : job?.proofRequired === false
          ? "Optional for this job"
          : "Required before completion",
    },
    {
      key: "completion",
      label: "Completion",
      detail: "Close the service and prepare the invoice",
    },
  ].map((stage, position) => {
    let state = "upcoming";
    if (position === 4)
      state = proofCount
        ? "completed"
        : status === "completed" && job?.proofRequired === false
          ? "completed"
          : active &&
              proofMissing &&
              ["in_progress", "on_hold"].includes(status)
            ? "blocked"
            : "upcoming";
    else if (status === "completed") state = "completed";
    else if (index >= 0 && position < index) state = "completed";
    else if (position === index)
      state = active
        ? status === "on_hold" || status === "otp_verified"
          ? "exceptional"
          : "current"
        : "blocked";
    if (!known || status === "cancelled")
      state = evidence[position]
        ? "completed"
        : position === 0
          ? "exceptional"
          : "blocked";
    else if (!active && state !== "completed") state = "blocked";
    return { ...stage, state };
  });
  return {
    action,
    blockedReason,
    stages,
    proofCount,
    proofMissing,
    active: Boolean(active),
    canUploadProof: Boolean(active && permissions.canUploadProof),
    canManageParts: Boolean(active && permissions.canManageParts),
    statusLabel: technicianStatusLabel(status),
  };
}
/** Synchronous exclusion covers the time before a React pending state can render. */
export function createTechnicianActionGate() {
  let busy = false;
  return {
    isBusy: () => busy,
    async run(work) {
      if (busy) return { ran: false };
      busy = true;
      try {
        return { ran: true, value: await work() };
      } finally {
        busy = false;
      }
    },
  };
}
export function technicianMutationMessage(
  error,
  fallback = "Your update was not confirmed. Refresh the job and try again.",
) {
  const status = error?.response?.status,
    message = error?.response?.data?.error;
  return status >= 400 &&
    status < 500 &&
    typeof message === "string" &&
    message.trim() &&
    message.length <= 240 &&
    !/[\r\n]/u.test(message)
    ? message
    : fallback;
}
export function technicianRequestStatus(error) {
  const value = error?.response?.status;
  return Number.isInteger(value) ? value : null;
}
