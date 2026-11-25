/** Shared by NextAuth, page protection and the custom Socket.IO server. */
export function credentialSessionIsCurrent(user, identity, now = Date.now()) {
  if (!user || !identity || user.isActive === false) return false;
  const expected = identity.credentialVersion ?? 0;
  const actual = user.credentialVersion ?? 0;
  if (
    !Number.isSafeInteger(expected) ||
    expected < 0 ||
    !Number.isSafeInteger(actual) ||
    actual < 0 ||
    expected !== actual
  )
    return false;
  if (identity.role && identity.role !== user.role) return false;
  if (
    user.mustChangePassword &&
    user.temporaryPasswordExpiresAt &&
    new Date(user.temporaryPasswordExpiresAt).getTime() <= now
  )
    return false;
  return true;
}
