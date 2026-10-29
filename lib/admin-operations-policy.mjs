export class AdminOperationError extends Error {}
import { catalogNameKey } from "./moderation-policy.mjs";
export function provisionArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (["--apply", "--ack-admin-access", "--help"].includes(flag))
      options[flag.slice(2)] = true;
    else if (
      ["--user-id", "--operator", "--request-id"].includes(flag) &&
      args[index + 1] &&
      !args[index + 1].startsWith("--")
    )
      options[flag.slice(2)] = args[++index];
    else
      throw new AdminOperationError(
        "Unknown or incomplete provisioning option.",
      );
  }
  if (options.help) return options;
  if (!/^[a-f0-9]{24}$/i.test(options["user-id"] || ""))
    throw new AdminOperationError(
      "Supply the existing trusted account's MongoDB --user-id.",
    );
  if (!/^[a-zA-Z0-9._-]{3,80}$/.test(options.operator || ""))
    throw new AdminOperationError(
      "Supply a non-sensitive --operator identifier (3–80 letters, digits, dots, underscores or hyphens).",
    );
  if (
    options.apply &&
    (!options["ack-admin-access"] ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        options["request-id"] || "",
      ))
  )
    throw new AdminOperationError(
      "Apply requires --ack-admin-access and a UUID v4 --request-id.",
    );
  return options;
}
export function provisionIssue(user, hasLinkedBusinessOrTechnician) {
  if (!user) return "Account not found.";
  if (user.isActive === false)
    return "Activate and validate the trusted account before provisioning.";
  if (user.mustChangePassword)
    return "The account must complete its password change before provisioning.";
  if (
    hasLinkedBusinessOrTechnician ||
    ["service_provider", "technician"].includes(user.role)
  )
    return "Use a separate trusted account without a linked provider or technician profile.";
  if (!["customer", "dispatcher", "admin"].includes(user.role))
    return "Complete ordinary account registration first.";
  return null;
}
export function legacyReviewChanges(record, type) {
  const changes = {};
  if (record.reviewVersion === undefined) changes.reviewVersion = 0;
  if (type === "offering") {
    if (record.approvalStatus == null) changes.approvalStatus = "pending";
    if (record.currency === undefined) changes.currency = "INR";
  }
  if (type === "provider" && record.verificationStatus == null)
    changes.verificationStatus = "pending";
  if (type === "catalog" && record.name)
    changes.normalizedName = catalogNameKey(record.name);
  return changes;
}
