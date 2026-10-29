/** @returns {{recipientUserId:string,title:string,message:string,type:"profile",entityType:"service_offering"|"service_provider",entityId:string,actionUrl:string,dedupeKey:string}} */
export function moderationMessage(audit) {
  const offering = audit.targetType === "offering",
    outcomes = {
      approve: "approved",
      reject: "rejected",
      request_changes: "changes requested",
      suspend: "suspended",
      restore: "restored",
    };
  return {
    recipientUserId: String(audit.notificationRecipientId),
    title: `${offering ? "Service offering" : "Business verification"}: ${outcomes[audit.action] || "updated"}`,
    message:
      "Review the decision and any requested changes in your business workspace.",
    type: "profile",
    entityType: offering ? "service_offering" : "service_provider",
    entityId: String(audit.targetId),
    actionUrl: offering
      ? "/service-provider/services"
      : "/service-provider/profile",
    dedupeKey: `moderation:${audit._id}`,
  };
}
