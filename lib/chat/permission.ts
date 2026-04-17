export function isPrivilegedRole(role?: string) {
  return role === "admin" || role === "dispatcher";
}

export function canAccessConversation(
  user: { _id: any; role?: string },
  conversation: any,
) {
  if (isPrivilegedRole(user.role)) return true;

  const userId = String(user._id);

  return Array.isArray(conversation?.participants)
    ? conversation.participants.some((p: any) => String(p.userId) === userId)
    : false;
}

export function normalizeParticipants(
  participants: Array<{ userId: string; role?: string }> = [],
  currentUser: { _id: any; role?: string },
) {
  const map = new Map<
    string,
    {
      userId: string;
      role: string;
      joinedAt: Date;
      lastReadAt: Date | null;
      unreadCount: number;
    }
  >();

  for (const p of participants) {
    if (!p?.userId) continue;

    map.set(String(p.userId), {
      userId: String(p.userId),
      role: p.role || "customer",
      joinedAt: new Date(),
      lastReadAt: null,
      unreadCount: 0,
    });
  }

  map.set(String(currentUser._id), {
    userId: String(currentUser._id),
    role: currentUser.role || "customer",
    joinedAt: new Date(),
    lastReadAt: new Date(),
    unreadCount: 0,
  });

  return Array.from(map.values());
};

// export function buildParticipantKey(
//   type: string,
//   jobId: string | undefined,
//   participants: Array<{ userId: string }>
// ) {
//   if (type === "job" && jobId) return `job:${jobId}`;

//   const ids = [...new Set(participants.map((p) => String(p.userId)))].sort();
//   return `${type}:${ids.join(":")}`;
// };

export function buildParticipantKey(jobId:string){
  return `job:${jobId}`;
}
