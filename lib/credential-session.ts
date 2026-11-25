import "server-only";
import { cache } from "react";
import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import { credentialSessionIsCurrent } from "@/lib/credential-session-policy.mjs";

// React's cache is scoped to a server render, never a cross-request revocation cache.
const readAccount = cache(async (id: string) => {
  await connectToDb();
  return User.findOne({ _id: id, isActive: { $ne: false } })
    .select(
      "_id role isActive credentialVersion mustChangePassword temporaryPasswordExpiresAt",
    )
    .lean();
});
export async function currentCredentialAccount(identity: {
  id?: unknown;
  role?: unknown;
  credentialVersion?: unknown;
}) {
  if (typeof identity.id !== "string" || !/^[a-f\d]{24}$/i.test(identity.id))
    return null;
  const user = await readAccount(identity.id);
  return credentialSessionIsCurrent(user, identity) ? user : null;
}
