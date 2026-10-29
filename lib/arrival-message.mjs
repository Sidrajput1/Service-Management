/** @returns {{recipientUserId:string,title:string,message:string,type:"job",entityType:"job",entityId:string,actionUrl:string,metadata:{bookingId:string},dedupeKey:string}} */
export function arrivalMessage(jobId, bookingId, recipientUserId) {
  return {
    recipientUserId: String(recipientUserId),
    title: "Pro arrived",
    message:
      "Your Pro has arrived at the service address. Share your visit verification code only when ready to begin.",
    type: "job",
    entityType: "job",
    entityId: String(jobId),
    actionUrl: `/customer/bookings/${bookingId}`,
    metadata: { bookingId: String(bookingId) },
    dedupeKey: `job-arrival:${jobId}`,
  };
}
