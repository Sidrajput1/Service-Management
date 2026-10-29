import mongoose from "mongoose";
import { resolveJobMembers, canReadResolvedConversation } from "@/lib/conversation-access.mjs";
import { ApiAuthError } from "@/lib/auth";
export async function authorizeConversation(user: { _id: unknown; role?: string }, conversation: unknown) {
  const members = await resolveJobMembers(mongoose.connection.db, conversation);
  if (!canReadResolvedConversation(user, conversation, members)) throw new ApiAuthError("Conversation access denied", 403);
}
